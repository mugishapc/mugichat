// MugiChat Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

function initApp() {
    // Initialize UI components
    initUI();
    
    // Initialize event listeners
    initEventListeners();
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Initialize service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    }
    
    // Check if PWA is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Running in PWA mode');
    } else {
        // Show install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showInstallPrompt();
        });
    }
}

function initUI() {
    // Initialize emoji picker
    initEmojiPicker();
    
    // Initialize file upload
    initFileUpload();
    
    // Load chats and contacts
    loadChats();
}

function initEventListeners() {
    // Message input events
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', handleMessageInput);
        messageInput.addEventListener('input', handleTyping);
    }
    
    // Send button event
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Chat item clicks
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', selectChat);
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Call buttons
    const voiceCallBtn = document.getElementById('voice-call-btn');
    const videoCallBtn = document.getElementById('video-call-btn');
    if (voiceCallBtn) voiceCallBtn.addEventListener('click', initiateVoiceCall);
    if (videoCallBtn) videoCallBtn.addEventListener('click', initiateVideoCall);
}

function handleMessageInput(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function handleTyping() {
    // Emit typing start event
    socket.emit('typing_start', {
        recipient_id: currentChat.id,
        is_group: currentChat.isGroup || false
    });
    
    // Set timeout to emit typing stop
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit('typing_stop', {
            recipient_id: currentChat.id,
            is_group: currentChat.isGroup || false
        });
    }, 1000);
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message) {
        // Create message object
        const messageData = {
            content: message,
            recipient_id: currentChat.id,
            is_group: currentChat.isGroup || false,
            timestamp: new Date().toISOString()
        };
        
        // Emit message via socket
        socket.emit('send_message', messageData);
        
        // Clear input
        messageInput.value = '';
        
        // Stop typing indicator
        clearTimeout(typingTimer);
        socket.emit('typing_stop', {
            recipient_id: currentChat.id,
            is_group: currentChat.isGroup || false
        });
    }
}

function selectChat(e) {
    const chatItem = e.currentTarget;
    const chatId = chatItem.dataset.chatId;
    const isGroup = chatItem.dataset.isGroup === 'true';
    
    // Remove active class from all chats
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected chat
    chatItem.classList.add('active');
    
    // Set current chat
    currentChat = {
        id: chatId,
        isGroup: isGroup,
        name: chatItem.querySelector('.chat-name').textContent,
        avatar: chatItem.querySelector('.chat-avatar').src
    };
    
    // Update chat header
    updateChatHeader();
    
    // Load messages for this chat
    loadMessages(chatId, isGroup);
    
    // Mark messages as read
    markMessagesAsRead(chatId, isGroup);
}

function updateChatHeader() {
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader && currentChat) {
        chatHeader.querySelector('.chat-header-avatar').src = currentChat.avatar;
        chatHeader.querySelector('.chat-header-name').textContent = currentChat.name;
        
        // Update status for users (online/offline)
        if (!currentChat.isGroup) {
            const user = users.find(u => u.id == currentChat.id);
            if (user) {
                const statusElem = chatHeader.querySelector('.chat-header-status');
                statusElem.textContent = user.is_online ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`;
            }
        }
    }
}

function loadMessages(chatId, isGroup) {
    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.innerHTML = '';
    
    // Show loading indicator
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    // Fetch messages from API
    const endpoint = isGroup ? `/api/groups/${chatId}/messages` : `/api/messages/${chatId}`;
    
    fetch(endpoint)
        .then(response => response.json())
        .then(messages => {
            messagesContainer.innerHTML = '';
            
            if (messages.length === 0) {
                messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start a conversation!</div>';
                return;
            }
            
            // Render messages
            messages.forEach(message => {
                const messageElement = createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            });
            
            // Scroll to bottom
            scrollToBottom();
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = '<div class="error">Failed to load messages</div>';
        });
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    const isOutgoing = message.sender_id === currentUser.id;
    
    messageDiv.className = `message ${isOutgoing ? 'message-out' : 'message-in'}`;
    messageDiv.dataset.messageId = message.id;
    
    let messageHTML = '';
    
    // Add sender name for group messages
    if (message.group_id && !isOutgoing) {
        const sender = users.find(u => u.id == message.sender_id);
        messageHTML += `<div class="message-sender">${sender ? sender.username : 'Unknown'}</div>`;
    }
    
    // Add reply context if exists
    if (message.reply_to_id) {
        const repliedMessage = messages.find(m => m.id == message.reply_to_id);
        if (repliedMessage) {
            messageHTML += `
                <div class="message-reply">
                    <div class="reply-sender">${repliedMessage.sender_id === currentUser.id ? 'You' : (users.find(u => u.id == repliedMessage.sender_id)?.username || 'Unknown')}</div>
                    <div class="reply-content">${repliedMessage.content}</div>
                </div>
            `;
        }
    }
    
    // Add message content
    if (message.message_type === 'text') {
        messageHTML += `<div class="message-content">${formatMessage(message.content)}</div>`;
    } else if (message.message_type === 'image') {
        messageHTML += `
            <div class="message-image">
                <img src="${message.file_url}" alt="Shared image" onclick="openImageModal('${message.file_url}')">
            </div>
        `;
    } else if (message.message_type === 'document') {
        messageHTML += `
            <div class="message-document">
                <div class="document-icon"><i class="fas fa-file"></i></div>
                <div class="document-info">
                    <a href="${message.file_url}" download>Download file</a>
                </div>
            </div>
        `;
    }
    
    // Add message time and status
    messageHTML += `
        <div class="message-time">
            ${formatTime(message.timestamp)}
            ${isOutgoing ? `<span class="message-status">${message.is_read ? '✓✓' : '✓'}</span>` : ''}
        </div>
    `;
    
    // Add reactions if any
    if (message.reactions && Object.keys(message.reactions).length > 0) {
        const reactionHTML = Object.entries(message.reactions)
            .map(([userId, emoji]) => `<span class="reaction">${emoji}</span>`)
            .join('');
        messageHTML += `<div class="message-reaction">${reactionHTML}</div>`;
    }
    
    messageDiv.innerHTML = messageHTML;
    
    // Add context menu for messages
    messageDiv.addEventListener('contextmenu', showMessageContextMenu);
    
    return messageDiv;
}

function formatMessage(text) {
    // Convert URLs to links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Convert emoji shortcodes to emojis
    const emojiMap = {
        ':)': '😊',
        ':(': '😢',
        ':D': '😃',
        ':P': '😛',
        ';)': '😉',
        ':O': '😮',
        ':*': '😗',
        '<3': '❤️'
    };
    
    Object.keys(emojiMap).forEach(shortcode => {
        text = text.replace(new RegExp(shortcode.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g'), emojiMap[shortcode]);
    });
    
    return text;
}

function scrollToBottom() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function showMessageContextMenu(e) {
    e.preventDefault();
    
    const messageId = e.currentTarget.dataset.messageId;
    const message = messages.find(m => m.id == messageId);
    
    if (!message) return;
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-item" onclick="replyToMessage(${messageId})">Reply</div>
        <div class="context-item" onclick="reactToMessage(${messageId})">React</div>
        ${message.sender_id === currentUser.id ? `
            <div class="context-item" onclick="deleteMessage(${messageId})">Delete</div>
        ` : ''}
    `;
    
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.zIndex = '1000';
    
    document.body.appendChild(contextMenu);
    
    // Remove context menu on click elsewhere
    const removeContextMenu = () => {
        document.body.removeChild(contextMenu);
        document.removeEventListener('click', removeContextMenu);
    };
    
    setTimeout(() => {
        document.addEventListener('click', removeContextMenu);
    }, 100);
}

function replyToMessage(messageId) {
    const message = messages.find(m => m.id == messageId);
    if (!message) return;
    
    const replyContainer = document.createElement('div');
    replyContainer.className = 'reply-container';
    replyContainer.innerHTML = `
        <div class="reply-preview">
            <div class="reply-info">Replying to ${message.sender_id === currentUser.id ? 'yourself' : users.find(u => u.id == message.sender_id)?.username}</div>
            <div class="reply-content">${message.content}</div>
            <button class="cancel-reply" onclick="cancelReply()"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    const inputContainer = document.querySelector('.message-input-container');
    inputContainer.parentNode.insertBefore(replyContainer, inputContainer);
    
    currentReply = messageId;
}

function reactToMessage(messageId) {
    // Show emoji picker for reaction
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker) {
        emojiPicker.style.display = 'block';
        emojiPicker.dataset.targetMessage = messageId;
        
        // Position near the message
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const rect = messageElement.getBoundingClientRect();
            emojiPicker.style.top = `${rect.top - 50}px`;
            emojiPicker.style.left = `${rect.left}px`;
        }
    }
}

function initiateVoiceCall() {
    if (!currentChat) return;
    
    socket.emit('initiate_call', {
        recipient_id: currentChat.id,
        is_group: currentChat.isGroup || false,
        call_type: 'voice',
        room_id: `call_${Date.now()}`
    });
    
    showCallScreen('outgoing', 'voice');
}

function initiateVideoCall() {
    if (!currentChat) return;
    
    socket.emit('initiate_call', {
        recipient_id: currentChat.id,
        is_group: currentChat.isGroup || false,
        call_type: 'video',
        room_id: `call_${Date.now()}`
    });
    
    showCallScreen('outgoing', 'video');
}

function showCallScreen(direction, type) {
    const callModal = document.createElement('div');
    callModal.className = 'call-modal';
    callModal.innerHTML = `
        <div class="call-container">
            <div class="caller-info">
                <img src="${currentChat.avatar}" class="caller-avatar" alt="${currentChat.name}">
                <div class="caller-name">${currentChat.name}</div>
                <div class="call-type">${type === 'voice' ? 'Voice Call' : 'Video Call'}</div>
                <div class="call-status">${direction === 'outgoing' ? 'Calling...' : 'Incoming Call'}</div>
            </div>
            <div class="call-buttons">
                ${direction === 'incoming' ? `
                    <div class="call-btn call-accept" onclick="acceptCall()">
                        <i class="fas fa-phone"></i>
                    </div>
                ` : ''}
                <div class="call-btn call-decline" onclick="endCall()">
                    <i class="fas fa-phone-slash"></i>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(callModal);
    currentCallModal = callModal;
}

function acceptCall() {
    // Join WebRTC room and establish connection
    if (currentCall) {
        socket.emit('accept_call', {
            room_id: currentCall.room_id
        });
        
        // Update UI for active call
        if (currentCallModal) {
            currentCallModal.querySelector('.call-status').textContent = 'Connected';
            currentCallModal.querySelector('.call-accept').style.display = 'none';
        }
    }
}

function endCall() {
    if (currentCall) {
        socket.emit('end_call', {
            room_id: currentCall.room_id
        });
    }
    
    if (currentCallModal) {
        document.body.removeChild(currentCallModal);
        currentCallModal = null;
        currentCall = null;
    }
}

function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'pwa-install-prompt';
    installPrompt.innerHTML = `
        <div class="pwa-install-text">Install MugiChat for a better experience</div>
        <button class="pwa-install-btn" onclick="installPWA()">Install</button>
        <div class="pwa-close-btn" onclick="closeInstallPrompt()">&times;</div>
    `;
    
    document.body.appendChild(installPrompt);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (document.body.contains(installPrompt)) {
            document.body.removeChild(installPrompt);
        }
    }, 10000);
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choiceResult => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
    
    // Remove the prompt
    const prompt = document.querySelector('.pwa-install-prompt');
    if (prompt) {
        document.body.removeChild(prompt);
    }
}

function closeInstallPrompt() {
    const prompt = document.querySelector('.pwa-install-prompt');
    if (prompt) {
        document.body.removeChild(prompt);
    }
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(timestamp) {
    if (!timestamp) return 'long time ago';
    
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return lastSeen.toLocaleDateString();
}

// Global variables
let currentUser = null;
let currentChat = null;
let users = [];
let messages = [];
let currentReply = null;
let currentCall = null;
let currentCallModal = null;
let typingTimer = null;
let deferredPrompt = null;