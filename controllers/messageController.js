const Message = require('../models/Message');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/messages'));
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /pdf|doc|docx|txt|jpg|jpeg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Get inbox messages
exports.getInbox = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in to access messages' });
        }

        const messages = await Message.find({ recipient: req.session.userId })
            .populate('sender', 'companyName email')
            .sort({ createdAt: -1 });
        
        res.render('messages/inbox', {
            messages,
            path: '/messages/inbox',
            user: req.session.userData
        });
    } catch (error) {
        console.error('Get inbox error:', error);
        res.status(500).render('error', { 
            message: 'Server Error',
            error: { status: 500, stack: error.message }
        });
    }
};

// Get sent messages
exports.getSent = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in to access messages' });
        }

        const messages = await Message.find({ sender: req.session.userId })
            .populate('recipient', 'companyName email')
            .sort({ createdAt: -1 });
        
        res.render('messages/sent', {
            messages,
            path: '/messages/sent',
            user: req.session.userData
        });
    } catch (error) {
        console.error('Get sent messages error:', error);
        res.status(500).render('error', { 
            message: 'Server Error',
            error: { status: 500, stack: error.message }
        });
    }
};

// Get single message
exports.getMessage = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in to access messages' });
        }

        const message = await Message.findById(req.params.id)
            .populate('sender', 'companyName email')
            .populate('recipient', 'companyName email');

        if (!message) {
            return res.status(404).render('error', { 
                message: 'Message not found',
                error: { status: 404 }
            });
        }

        // Check if user is either sender or recipient
        if (message.sender._id.toString() !== req.session.userId && 
            message.recipient._id.toString() !== req.session.userId) {
            return res.status(403).render('error', { 
                message: 'Not authorized to view this message',
                error: { status: 403 }
            });
        }

        // Mark as read if recipient is viewing
        if (message.recipient._id.toString() === req.session.userId && !message.isRead) {
            message.isRead = true;
            await message.save();
        }

        res.render('messages/view', {
            message,
            path: '/messages',
            user: req.session.userData
        });
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).render('error', { 
            message: 'Server Error',
            error: { status: 500, stack: error.message }
        });
    }
};

// Send new message
exports.sendMessage = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in to send messages' });
        }

        const { recipient, subject, content } = req.body;
        
        const recipientUser = await User.findOne({ email: recipient });
        if (!recipientUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Recipient not found' 
            });
        }

        const message = await Message.create({
            sender: req.session.userId,
            recipient: recipientUser._id,
            subject,
            content
        });

        res.status(201).json({ 
            success: true, 
            message: 'Message sent successfully',
            data: message
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error' 
        });
    }
};

// Delete message
exports.deleteMessage = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in to delete messages' });
        }

        const message = await Message.findById(req.params.id);
        
        if (!message) {
            return res.status(404).json({ 
                success: false, 
                message: 'Message not found' 
            });
        }

        // Only allow sender or recipient to delete
        if (message.sender.toString() !== req.session.userId && 
            message.recipient.toString() !== req.session.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized to delete this message' 
            });
        }

        await message.deleteOne();
        res.json({ 
            success: true, 
            message: 'Message deleted successfully' 
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error' 
        });
    }
};

// Upload attachment
exports.uploadAttachment = upload.array('attachments', 5);

// Get unread message count
exports.getUnreadCount = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in to check messages' });
        }

        const count = await Message.countDocuments({
            recipient: req.session.userId,
            isRead: false
        });
        
        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error' 
        });
    }
}; 