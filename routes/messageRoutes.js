const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getInbox,
    getSent,
    getMessage,
    sendMessage,
    deleteMessage,
    uploadAttachment,
    getUnreadCount
} = require('../controllers/messageController');

// Get unread message count
router.get('/unread-count', protect, getUnreadCount);

// Get inbox messages
router.get('/inbox', protect, getInbox);

// Get sent messages
router.get('/sent', protect, getSent);

// Get single message
router.get('/:id', protect, getMessage);

// Send new message
router.post('/send', protect, sendMessage);

// Delete message
router.delete('/:id', protect, deleteMessage);

// Upload attachment
router.post('/:id/attachments', protect, uploadAttachment);

module.exports = router; 