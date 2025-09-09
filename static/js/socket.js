// Socket.IO event handlers

// Socket connection established
socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    
    // Join user's personal room
    if (currentUser) {
        socket.emit('join_user_room', { user_id: currentUser.id });
    }
});

// Socket connection lost
socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    
    // Show connection status
    showConnectionStatus('Disconnected. Trying to reconnect...');
});

// Socket reconnected
socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after', attemptNumber, 'attempts');
    
    // Hide connection status
    hideConnectionStatus();
    
    // Rejoin user's personal room
    if (currentUser) {
        socket.emit('join_user_room', { user_id: currentUser.id });
    }
});

// Receive new message
socket.on('receive_message', (messageData) => {
    console.log('New message received:', messageData);
    
    // Check if message is for current chat
    if (currentChat && 
        ((!messageData.is_group && messageData.sender_id === currentChat.id) || 
         (messageData.is_group && messageData.group_id === currentChat.id))) {
        // Add message to UI
        addMessageToUI(messageData);
        
        // Mark message as read
        if (messageData.sender_id !== currentUser.id) {
            socket.emit('mark_as_read', {
                message_id: messageData.id,
                recipient_id: messageData.sender_id
            });
        }
    } else {
        // Show notification for new message
        showNewMessageNotification(messageData);
    }
    
    // Update chat list with new message
    updateChatList(messageData);
});

// Message sent successfully
socket.on('message_sent', (messageData) => {
    console.log('Message sent successfully:', messageData);
    
    // Add message to UI with sent status
    addMessageToUI(messageData);
});

// User typing indicator
socket.on('user_typing', (data) => {
    console.log('User typing:', data);
    
    if (currentChat && data.user_id === currentChat.id) {
        showTypingIndicator(data.user_id, data.user_name);
    }
});

// User stopped typing
socket.on('user_stopped_typing', (data) => {
    console.log('User stopped typing:', data);
    
    if (currentChat && data.user_id === currentChat.id) {
        hideTypingIndicator(data.user_id);
    }
});

// User online status changed
socket.on('user_status', (data) => {
    console.log('User status changed:', data);
    
    // Update user status in contacts list
    updateUserStatus(data.user_id, data.is_online, data.last_seen);
    
    // Update chat header if current chat user
    if (currentChat && currentChat.id === data.user_id && !currentChat.isGroup) {
        updateChatHeaderStatus(data.is_online, data.last_seen);
    }
});

// Incoming call
socket.on('incoming_call', (callData) => {
    console.log('Incoming call:', callData);
    
    // Store current call data
    currentCall = callData;
    
    // Show incoming call UI
    showIncomingCall(callData);
});

// Call accepted
socket.on('call_accepted', (data) => {
    console.log('Call accepted:', data);
    
    if (currentCall && currentCall.room_id === data.room_id) {
        // Start WebRTC connection
        startWebRTCConnection(data);
        
        // Update call UI
        updateCallStatus('Connected');
    }
});

// Call rejected
socket.on('call_rejected', (data) => {
    console.log('Call rejected:', data);
    
    if (currentCall && currentCall.room_id === data.room_id) {
        // Show call rejected message
        showCallEnded('Call rejected');
        
        // Clear current call
        currentCall = null;
    }
});

// Call ended
socket.on('call_ended', (data) => {
    console.log('Call ended:', data);
    
    if (currentCall && currentCall.room_id === data.room_id) {
        // Show call ended message
        showCallEnded('Call ended');
        
        // Clear current call
        currentCall = null;
    }
});

// WebRTC signaling events
socket.on('webrtc_offer', (data) => {
    console.log('WebRTC offer received:', data);
    handleWebRTCOffer(data);
});

socket.on('webrtc_answer', (data) => {
    console.log('WebRTC answer received:', data);
    handleWebRTCAnswer(data);
});

socket.on('webrtc_ice_candidate', (data) => {
    console.log('WebRTC ICE candidate received:', data);
    handleWebRTCICECandidate(data);
});

// Error handling
socket.on('error', (errorData) => {
    console.error('Socket error:', errorData);
    showError(errorData.message || 'An error occurred');
});

// Connection error
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    showConnectionStatus('Connection error. Trying to reconnect...');
});

// Reconnection attempt
socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Reconnection attempt:', attemptNumber);
    showConnectionStatus(`Reconnecting... (Attempt ${attemptNumber})`);
});

// Reconnection failed
socket.on('reconnect_failed', () => {
    console.error('Reconnection failed');
    showConnectionStatus('Reconnection failed. Please refresh the page.');
});

// Utility functions for socket events
function showConnectionStatus(message) {
    // Create or update connection status indicator
    let statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'connection-status';
        document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.style.display = 'block';
}

function hideConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

function showError(message) {
    // Create error notification
    const errorElement = document.createElement('div');
    errorElement.className = 'error-notification';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

function showNewMessageNotification(messageData) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
        return;
    }
    
    // Check if notification permission is granted
    if (Notification.permission === 'granted') {
        createMessageNotification(messageData);
    } else if (Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                createMessageNotification(messageData);
            }
        });
    }
}

function createMessageNotification(messageData) {
    // Get sender name
    const sender = users.find(u => u.id === messageData.sender_id) || { username: 'Unknown' };
    
    // Create notification
    const notification = new Notification(`New message from ${sender.username}`, {
        body: messageData.content || 'Media message',
        icon: sender.profile_picture || '/static/images/default-avatar.png',
        tag: 'mugichat_message'
    });
    
    // Notification click handler
    notification.onclick = function() {
        window.focus();
        
        // Switch to the chat where the message came from
        if (messageData.is_group) {
            selectGroupChat(messageData.group_id);
        } else {
            selectPrivateChat(messageData.sender_id);
        }
        
        // Close the notification
        notification.close();
    };
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        notification.close();
    }, 10000);
}

// WebRTC functions
let localStream = null;
let remoteStream = null;
let peerConnection = null;
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function startWebRTCConnection(isCaller = false) {
    try {
        // Get local media stream
        const mediaConstraints = {
            audio: true,
            video: currentCall?.call_type === 'video'
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        // Display local video
        if (currentCall?.call_type === 'video') {
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = localStream;
            }
        }
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Get remote stream
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = remoteStream;
            }
        };
        
        // ICE candidate handler
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_ice_candidate', {
                    room_id: currentCall.room_id,
                    candidate: event.candidate
                });
            }
        };
        
        // If caller, create offer
        if (isCaller) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            socket.emit('webrtc_offer', {
                room_id: currentCall.room_id,
                offer: offer
            });
        }
    } catch (error) {
        console.error('WebRTC error:', error);
        showError('Failed to start media devices');
        endCall();
    }
}

async function handleWebRTCOffer(data) {
    if (!peerConnection) {
        await startWebRTCConnection(false);
    }
    
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('webrtc_answer', {
        room_id: currentCall.room_id,
        answer: answer
    });
}

async function handleWebRTCAnswer(data) {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(data.answer);
    }
}

async function handleWebRTCICECandidate(data) {
    if (peerConnection) {
        await peerConnection.addIceCandidate(data.candidate);
    }
}

function toggleVideo() {
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const isEnabled = videoTracks[0].enabled;
            videoTracks[0].enabled = !isEnabled;
            
            // Update UI
            const videoIcon = document.getElementById('video-icon');
            if (videoIcon) {
                if (isEnabled) {
                    videoIcon.classList.remove('fa-video');
                    videoIcon.classList.add('fa-video-slash');
                } else {
                    videoIcon.classList.remove('fa-video-slash');
                    videoIcon.classList.add('fa-video');
                }
            }
        }
    }
}

function toggleAudio() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const isEnabled = audioTracks[0].enabled;
            audioTracks[0].enabled = !isEnabled;
            
            // Update UI
            const audioIcon = document.getElementById('audio-icon');
            if (audioIcon) {
                if (isEnabled) {
                    audioIcon.classList.remove('fa-microphone');
                    audioIcon.classList.add('fa-microphone-slash');
                } else {
                    audioIcon.classList.remove('fa-microphone-slash');
                    audioIcon.classList.add('fa-microphone');
                }
            }
        }
    }
}

function endCall() {
    // Send call end signal
    if (currentCall) {
        socket.emit('end_call', {
            room_id: currentCall.room_id
        });
    }
    
    // Close media streams
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Hide call modal
    if (currentCallModal) {
        currentCallModal.style.display = 'none';
        currentCallModal = null;
    }
    
    // Clear current call
    currentCall = null;
}