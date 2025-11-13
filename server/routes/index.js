const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/hackathons', require('./hackathons'));
router.use('/students', require('./students'));
router.use('/analytics', require('./analytics'));
router.use('/registrations', require('./registrations'));

module.exports = router;