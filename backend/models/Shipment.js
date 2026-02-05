const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
    trackingId: {
        type: String,
        required: true,
        unique: true
    },
    sender: {
        name: String,
        address: String,
        phone: String
    },
    receiver: {
        name: String,
        address: String,
        phone: String
    },
    status: {
        type: String,
        enum: ['Pending', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        name: String
    },
    weight: Number,
    dimensions: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    estimatedDelivery: Date,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
