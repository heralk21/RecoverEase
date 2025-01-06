const express = require('express');
const appService = require('./appService');

const router = express.Router();


// ----------------------------------------------------------
// API endpoints

// Initialize Database
router.post('/initialize-database', async (req, res) => {
    const result = await appService.initializeDatabase();
    if (result.success) {
        res.json({ success: true, message: 'Database initialized successfully.' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// User Registration
router.post('/users/register', async (req, res) => {
    const { name, email, phone, role } = req.body;
    const result = await appService.registerUser(name, email, phone, role);
    if (result.success) {
        res.json({ success: true, userId: result.userId });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// Report Lost Item
router.post('/items/report-lost', async (req, res) => {
    const { description, categoryId, locationId, userId } = req.body;
    const result = await appService.reportLostItem(description, categoryId, locationId, userId);
    if (result.success) {
        res.json({ success: true, itemId: result.itemId });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// Report Found Item
router.post('/items/report-found', async (req, res) => {
    const { description, categoryId, locationId, userId } = req.body;
    const result = await appService.reportFoundItem(description, categoryId, locationId, userId);
    if (result.success) {
        res.json({ success: true, itemId: result.itemId });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// Get Lost Items
router.get('/items/lost', async (req, res) => {
    const items = await appService.getLostItems();
    res.json({ success: true, data: items });
});

// Get Found Items
router.get('/items/found', async (req, res) => {
    const items = await appService.getFoundItems();
    res.json({ success: true, data: items });
});

// Claim Item
router.post('/items/claim', async (req, res) => {
    const { userId, itemId } = req.body;
    const result = await appService.claimItem(userId, itemId);
    if (result.success) {
        res.json({ success: true, claimId: result.claimId });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// Get Notifications
router.get('/notifications/:userId', async (req, res) => {
    const userId = req.params.userId;
    const notifications = await appService.getNotifications(userId);
    res.json({ success: true, data: notifications });
});

// DELETE Operation: Delete Report
router.delete('/reports/user/:userId/item/:itemId', async (req, res) => {
    const userId = req.params.userId;
    const itemId = req.params.itemId;
    const result = await appService.deleteReport(userId, itemId);
    if (result.success) {
        res.json({ success: true, message: 'Report deleted successfully.' });
    } else {
        res.status(404).json({ success: false, error: result.error });
    }
});
// Get all items for selection
router.get('/items', async (req, res) => {
    const items = await appService.getAllItems();
    res.json({ success: true, data: items });
});

// Update Item with multiple attributes
router.put('/items/:itemId', async (req, res) => {
    const itemId = req.params.itemId;
    const attributesToUpdate = req.body; // Contains key-value pairs of attributes to update
    const result = await appService.updateItem(itemId, attributesToUpdate);
    if (result.success) {
        res.json({ success: true, message: 'Item updated successfully.' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});


// Projection and Join: Get Items by Category
router.get('/items/category/:categoryName', async (req, res) => {
    const categoryName = req.params.categoryName;
    const items = await appService.getItemsByCategory(categoryName);
    res.json({ success: true, data: items });
});

// Aggregation with GROUP BY: Get Lost Items Count Per Category
router.get('/stats/lost-items-count', async (req, res) => {
    const data = await appService.getLostItemsCountPerCategory();
    res.json({ success: true, data });
});

// Aggregation with HAVING: Get Categories with Lost Items over Threshold
router.get('/stats/categories-with-lost-items-over/:threshold', async (req, res) => {
    const threshold = parseInt(req.params.threshold);
    const data = await appService.getCategoriesWithLostItemsOver(threshold);
    res.json({ success: true, data });
});

// Nested Aggregation with GROUP BY: Get Top Category Per Building
router.get('/stats/top-category-per-building', async (req, res) => {
    const data = await appService.getTopCategoryPerBuilding();
    res.json({ success: true, data });
});

// Division: Get Users Reporting All Categories
router.get('/stats/users-reporting-all-categories', async (req, res) => {
    const data = await appService.getUsersReportingAllCategories();
    res.json({ success: true, data });
});

// Get Claim Table Data
router.get('/claims', async (req, res) => {
    const result = await appService.getClaims();
    if (result.success) {
        res.json({ success: true, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// Selection Route
router.post('/items/search', async (req, res) => {
    const { conditions, logic } = req.body; // Extract 'conditions' array and 'logic' value
    try {
        const data = await appService.searchItems(conditions, logic);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Projection Route
router.post('/items/projection', async (req, res) => {
    const attributes = req.body.attributes; // Array of attribute names
    const data = await appService.getItemsWithAttributes(attributes);
    res.json({ success: true, data });
});



module.exports = router;


