const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// GET /api/items
router.get('/items', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/items
router.post('/items', async (req, res) => {
    const item = new Item({
        name: req.body.name,
        description: req.body.description
    });

    try {
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Mock Data
const articles = [
    { slug: 'how-to-train-your-dragon', title: 'How to train your dragon', description: 'Ever wonder how?', body: 'You have to believe.', tagList: ['dragons', 'training'] },
    { slug: 'how-to-train-your-dragon-2', title: 'How to train your dragon 2', description: 'So toothless.', body: 'It is a dragon.', tagList: ['dragons', 'training'] }
];

// GET /api/articles
router.get('/articles', (req, res) => {
    res.json({ articles, articlesCount: articles.length });
});

// POST /api/users/login (Mock)
router.post('/users/login', (req, res) => {
    const { email, password } = req.body.user || {};
    if (email === 'jake@jake.jake' && password === 'jakejake') {
        return res.json({
            user: {
                email: 'jake@jake.jake',
                token: 'jwt.token.here',
                username: 'jake',
                bio: 'I work at statefarm',
                image: null
            }
        });
    }
    res.status(422).json({ errors: { 'email or password': ['is invalid'] } });
});

module.exports = router;
