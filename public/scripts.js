// scripts.js

// Initialize Database
async function initializeDatabase() {
    const response = await fetch('/initialize-database', {
        method: 'POST'
    });
    const responseData = await response.json();
    const messageElement = document.getElementById('databaseInitializationResultMsg');

    if (responseData.success) {
        messageElement.textContent = responseData.message;
    } else {
        messageElement.textContent = `Error initializing database: ${responseData.error}`;
    }
}

// User Registration
async function registerUser(event) {
    event.preventDefault();

    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = document.getElementById('userPhone').value;
    const role = document.getElementById('userRole').value;

    const response = await fetch('/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role })
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('registrationResultMsg');

    if (responseData.success) {
        messageElement.textContent = `User registered successfully! User ID: ${responseData.userId}`;
    } else {
        messageElement.textContent = `Error registering user: ${responseData.error}`;
    }
}

// Report Lost Item (with foreign key validation error handling)
async function reportLostItem(event) {
    event.preventDefault();

    const description = document.getElementById('lostItemDescription').value;
    const categoryId = document.getElementById('lostItemCategory').value;
    const locationId = document.getElementById('lostItemLocation').value;
    const userId = document.getElementById('lostItemUserId').value;

    const response = await fetch('/items/report-lost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, categoryId, locationId, userId })
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('lostItemResultMsg');

    if (responseData.success) {
        messageElement.textContent = `Lost item reported successfully! Item ID: ${responseData.itemId}`;
    } else {
        messageElement.textContent = `Error reporting lost item: ${responseData.error}`;
    }
}

// Report Found Item (with foreign key validation error handling)
async function reportFoundItem(event) {
    event.preventDefault();

    const description = document.getElementById('foundItemDescription').value;
    const categoryId = document.getElementById('foundItemCategory').value;
    const locationId = document.getElementById('foundItemLocation').value;
    const userId = document.getElementById('foundItemUserId').value;

    const response = await fetch('/items/report-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, categoryId, locationId, userId })
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('foundItemResultMsg');

    if (responseData.success) {
        messageElement.textContent = `Found item reported successfully! Item ID: ${responseData.itemId}`;
    } else {
        messageElement.textContent = `Error reporting found item: ${responseData.error}`;
    }
}

// Fetch Lost Items
async function fetchLostItems() {
    const response = await fetch('/items/lost', { method: 'GET' });
    const responseData = await response.json();
    const tableBody = document.getElementById('lostItemsTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(item => {
        const row = tableBody.insertRow();
        Object.values(item).forEach((field, index) => {
            const cell = row.insertCell(index);
            cell.textContent = field;
        });
    });
}

// Fetch Found Items
async function fetchFoundItems() {
    const response = await fetch('/items/found', { method: 'GET' });
    const responseData = await response.json();
    const tableBody = document.getElementById('foundItemsTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(item => {
        const row = tableBody.insertRow();
        Object.values(item).forEach((field, index) => {
            const cell = row.insertCell(index);
            cell.textContent = field;
        });
    });
}

// Claim Item
async function claimItem(event) {
    event.preventDefault();

    const userId = document.getElementById('claimUserId').value;
    const itemId = document.getElementById('claimItemId').value;

    const response = await fetch('/items/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId })
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('claimResultMsg');

    if (responseData.success) {
        messageElement.textContent = `Item claimed successfully! Claim ID: ${responseData.claimId}`;
    } else {
        messageElement.textContent = `Error claiming item: ${responseData.error}`;
    }
}

// Fetch Notifications
async function fetchNotifications(event) {
    event.preventDefault();

    const userId = document.getElementById('notificationUserId').value;
    const response = await fetch(`/notifications/${userId}`, { method: 'GET' });
    const responseData = await response.json();
    const notificationList = document.getElementById('notificationList');
    notificationList.innerHTML = '';

    responseData.data.forEach(notification => {
        const listItem = document.createElement('li');
        listItem.textContent = `Notification ID: ${notification.NOTIFICATIONID}, Item ID: ${notification.ITEMID}, Date: ${notification.NOTIFICATIONDATE}`;
        notificationList.appendChild(listItem);
    });
}


// Delete Report
async function deleteReport(event) {
    event.preventDefault();

    const userId = document.getElementById('deleteReportUserId').value;
    const itemId = document.getElementById('deleteReportItemId').value;

    const response = await fetch(`/reports/user/${userId}/item/${itemId}`, {
        method: 'DELETE'
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('deleteReportResultMsg');

    if (response.ok && responseData.success) {
        messageElement.textContent = responseData.message;
    } else {
        messageElement.textContent = `Error deleting report: ${responseData.error || response.statusText}`;
    }
}
// Fetch All Items for Update Form
async function fetchAllItemsForUpdate() {
    const response = await fetch('/items', { method: 'GET' });
    const responseData = await response.json();
    const selectElement = document.getElementById('updateItemId');
    selectElement.innerHTML = '';

    responseData.data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.ITEMID;
        option.textContent = `ID: ${item.ITEMID} - ${item.DESCRIPTION}`;
        selectElement.appendChild(option);
    });
}

// Update Item (Multiple Attributes)
async function updateItem(event) {
    event.preventDefault();

    const itemId = document.getElementById('updateItemId').value;
    const description = document.getElementById('updateItemDescription').value;
    const categoryId = document.getElementById('updateItemCategoryId').value;
    const statusId = document.getElementById('updateItemStatusId').value;
    const locationId = document.getElementById('updateItemLocationId').value;

    // Build attributes to update
    const attributesToUpdate = {};
    if (description) attributesToUpdate.Description = description;
    if (categoryId) attributesToUpdate.CategoryID = categoryId;
    if (statusId) attributesToUpdate.StatusID = statusId;
    if (locationId) attributesToUpdate.LocationID = locationId;

    const response = await fetch(`/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributesToUpdate)
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('updateItemResultMsg');

    if (responseData.success) {
        messageElement.textContent = responseData.message;
    } else {
        messageElement.textContent = `Error updating item: ${responseData.error}`;
    }
}


// Get Items by Category
async function fetchItemsByCategory(event) {
    event.preventDefault();

    const categoryName = document.getElementById('categoryName').value;
    const response = await fetch(`/items/category/${categoryName}`, { method: 'GET' });
    const responseData = await response.json();
    const tableBody = document.getElementById('itemsByCategoryTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(item => {
        const row = tableBody.insertRow();
        item.forEach((field, index) => {
            const cell = row.insertCell(index);
            cell.textContent = field;
        });
    });
}


// Get Lost Items Count Per Category
async function fetchLostItemsCountPerCategory() {
    const response = await fetch('/stats/lost-items-count', { method: 'GET' });
    const responseData = await response.json();
    const tableBody = document.getElementById('lostItemsCountTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(rowData => {
        const row = tableBody.insertRow();
        rowData.forEach((field, index) => {
            const cell = row.insertCell(index);
            cell.textContent = field;
        });
    });
}


// Get Top Category Per Building
async function fetchTopCategoryPerBuilding() {
    const response = await fetch('/stats/top-category-per-building', { method: 'GET' });
    const responseData = await response.json();
    const tableBody = document.getElementById('topCategoryPerBuildingTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(rowData => {
        const row = tableBody.insertRow();
        rowData.forEach((field, index) => {
            const cell = row.insertCell(index);
            cell.textContent = field;
        });
    });
}

// Search Items (Selection with multiple conditions)
async function searchItems(event) {
    event.preventDefault();

    // Collect conditions
    const conditions = [];
    const conditionRows = document.querySelectorAll('.condition-row');
    conditionRows.forEach(row => {
        const attribute = row.querySelector('.condition-attribute').value;
        const operator = row.querySelector('.condition-operator').value;
        const value = row.querySelector('.condition-value').value;
        conditions.push({ attribute, operator, value });
    });

    const logic = document.querySelector('input[name="conditionLogic"]:checked').value;

    const response = await fetch('/items/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions, logic })
    });

    const responseData = await response.json();
    const tableBody = document.getElementById('searchResultsTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(item => {
        const row = tableBody.insertRow();
        Object.values(item).forEach((field, index) => {
            const cell = row.insertCell(index);
            cell.textContent = field;
        });
    });
}

// Add Condition Row (for Selection)
function addConditionRow() {
    const conditionContainer = document.getElementById('conditionContainer');
    const conditionRow = document.createElement('div');
    conditionRow.className = 'condition-row';

    conditionRow.innerHTML = `
        <select class="condition-attribute">
            <option value="Description">Description</option>
            <option value="CategoryID">CategoryID</option>
            <option value="StatusID">StatusID</option>
            <option value="LocationID">LocationID</option>
        </select>
        <select class="condition-operator">
            <option value="=">=</option>
            <option value="!=">!=</option>
            <option value=">">></option>
            <option value="<"><</option>
            <option value="LIKE">LIKE</option>
        </select>
        <input type="text" class="condition-value">
        <button type="button" onclick="removeConditionRow(this)">Remove</button>
    `;
    conditionContainer.appendChild(conditionRow);
}

// Remove Condition Row
function removeConditionRow(button) {
    const conditionRow = button.parentElement;
    conditionRow.remove();
}

// Get Items with Selected Attributes (Projection)
async function getItemsWithSelectedAttributes(event) {
    event.preventDefault();

    const checkboxes = document.querySelectorAll('.projection-attribute');
    const selectedAttributes = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedAttributes.push(checkbox.value);
        }
    });

    const response = await fetch('/items/projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes: selectedAttributes })
    });

    const responseData = await response.json();
    const tableBody = document.getElementById('projectionResultsTableBody');
    tableBody.innerHTML = '';

    responseData.data.forEach(item => {
        const row = tableBody.insertRow();
        selectedAttributes.forEach(attr => {
            const cell = row.insertCell();
            cell.textContent = item[attr.toUpperCase()];
        });
    });
}

// Fetch Claim Table Data
async function fetchClaimTable() {
    const response = await fetch('/claims', { method: 'GET' });
    const responseData = await response.json();
    const tableBody = document.getElementById('claimTableBody');
    tableBody.innerHTML = '';

    if (responseData.success) {
        responseData.data.forEach(row => {
            const rowElement = tableBody.insertRow();
            row.forEach((cellData, index) => {
                const cell = rowElement.insertCell(index);
                cell.textContent = cellData;
            });
        });
    } else {
        const row = tableBody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 6;
        cell.textContent = `Error fetching Claim data: ${responseData.error}`;
    }
}

// Initialize event listeners
window.onload = function() {
    document.getElementById('initializeDatabaseBtn').addEventListener('click', initializeDatabase);
    document.getElementById('userRegistrationForm').addEventListener('submit', registerUser);
    document.getElementById('lostItemForm').addEventListener('submit', reportLostItem);
    document.getElementById('foundItemForm').addEventListener('submit', reportFoundItem);
    document.getElementById('fetchLostItemsBtn').addEventListener('click', fetchLostItems);
    document.getElementById('fetchFoundItemsBtn').addEventListener('click', fetchFoundItems);
    document.getElementById('claimItemForm').addEventListener('submit', claimItem);
    document.getElementById('fetchNotificationsForm').addEventListener('submit', fetchNotifications);

    // Updated event listeners
    document.getElementById('deleteReportForm').addEventListener('submit', deleteReport);
    document.getElementById('updateItemForm').addEventListener('submit', updateItem);
    fetchAllItemsForUpdate(); // Fetch items on page load for update form

    document.getElementById('addConditionBtn').addEventListener('click', addConditionRow);
    document.getElementById('searchItemsForm').addEventListener('submit', searchItems);

    document.getElementById('projectionForm').addEventListener('submit', getItemsWithSelectedAttributes);
    document.getElementById('fetchItemsByCategoryForm').addEventListener('submit', fetchItemsByCategory);

    document.getElementById('fetchLostItemsCountBtn').addEventListener('click', fetchLostItemsCountPerCategory);
    document.getElementById('fetchCategoriesWithLostItemsForm').addEventListener('submit', fetchCategoriesWithLostItemsOver);
    document.getElementById('fetchTopCategoryPerBuildingBtn').addEventListener('click', fetchTopCategoryPerBuilding);
    document.getElementById('fetchUsersReportingAllCategoriesBtn').addEventListener('click', fetchUsersReportingAllCategories);
    document.getElementById('fetchClaimTableBtn').addEventListener('click', fetchClaimTable);
};
