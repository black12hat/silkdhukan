const express = require('express');
const {
  createEscrow,
  releaseEscrow,
  disputeEscrow,
  getEscrowById
} = require('../controllers/escrowController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/create')
  .post(protect, authorize('buyer'), createEscrow);

router.route('/:id')
  .get(protect, getEscrowById);

router.route('/:id/release')
  .put(protect, authorize('buyer'), releaseEscrow);

router.route('/:id/dispute')
  .put(protect, authorize('buyer'), disputeEscrow);

module.exports = router;