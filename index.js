const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const {
    v4: uuidv4
} = require("uuid");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error("Could not connect to MongoDB:", err));

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    nickname: {
        type: String,
        required: true,
        unique: true
    },
    clan: String,
});
const User = mongoose.model("User", userSchema);

const messageSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    message_id: {
        type: String,
        required: true,
        unique: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
});
const Message = mongoose.model("Message", messageSchema);

app.post("/risitas", async (req, res) => {
    const {
        clan,
        nickname
    } = req.body;
    try {
        const newUser = new User({
            id: uuidv4(),
            nickname,
            clan
        });
        await newUser.save();
        res.json(newUser);
    } catch (err) {
        res.status(500).send("Server error");
    }
});

app.post("/connect", async (req, res) => {
    try {
        const user = await User.findOne({
            id: req.body.id
        });
        if (!user) return res.status(404).send("User not found");
        res.json(user);
    } catch (err) {
        res.status(500).send("Server error");
    }
});

app.post("/change_clan", async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({
            id: req.body.id
        }, {
            clan: req.body.newclan
        }, {
            new: true
        }, );
        if (!user) return res.status(404).send("User not found");
        res.json(user);
    } catch (err) {
        res.status(500).send("Server error");
    }
});

app.post("/change_name", async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({
            id: req.body.id
        }, {
            nickname: req.body.newname
        }, {
            new: true
        }, );
        if (!user) return res.status(404).send("User not found");
        res.json(user);
    } catch (err) {
        res.status(500).send("Server error");
    }
});

app.post("/send_message", async (req, res) => {
    try {
        const user = await User.findOne({
            id: req.body.userId
        });
        if (!user) return res.status(404).send("User not found");
        const newMessage = new Message({
            userId: user.id,
            message: req.body.message,
            message_id: uuidv4(),
        });
        await newMessage.save();
        res
            .status(201)
            .json({
                message: "Message sent successfully",
                message_id: newMessage.message_id,
            });
    } catch (err) {
        console.error("Error on /send_message:", err);
        res.status(500).send("Server error");
    }
});

app.post("/fetch_messages", async (req, res) => {
    try {
        const lastMessageTimestamp = new Date(req.body.lastMessageTimestamp || 0);
        const limit = Math.min(parseInt(req.body.limit) || 20, 50);
        const messages = await Message.find({
                timestamp: {
                    $gt: lastMessageTimestamp
                },
            })
            .sort({
                timestamp: -1
            })
            .limit(limit)
            .lean();
        const messagesWithUser = await Promise.all(
            messages.map(async (message) => {
                const user = await User.findOne({
                    id: message.userId
                }).lean();
                return {
                    user_clan: user.clan,
                    user_name: user.nickname,
                    ...message
                };
            }),
        );
        res.json(messagesWithUser);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).send("Server error");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
