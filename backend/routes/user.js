const express = require('express');
const router = express.Router();
const { createUser, getUser, updateUser, deleteUser } = require('../controllers/user');

router.post('/create', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
