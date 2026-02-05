const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Shipment = require('../models/Shipment');

// @route   POST api/shipments
// @desc    Create a new shipment
router.post('/', auth, async (req, res) => {
    try {
        const newShipment = new Shipment({
            ...req.body,
            user: req.user.id
        });
        const shipment = await newShipment.save();
        res.json(shipment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/shipments
// @desc    Get all shipments for logged in user
router.get('/', auth, async (req, res) => {
    try {
        const shipments = await Shipment.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(shipments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/shipments/:trackingId
// @desc    Get shipment by tracking ID
router.get('/:trackingId', async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ trackingId: req.params.trackingId });
        if (!shipment) {
            return res.status(404).json({ msg: 'Shipment not found' });
        }
        res.json(shipment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/shipments/:id
// @desc    Update shipment status/location
router.patch('/:id', auth, async (req, res) => {
    try {
        let shipment = await Shipment.findById(req.params.id);
        if (!shipment) return res.status(404).json({ msg: 'Shipment not found' });

        // Make sure user owns shipment
        if (shipment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        shipment = await Shipment.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(shipment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
