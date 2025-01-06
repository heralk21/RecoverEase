const oracledb = require('oracledb');
const loadEnvFile = require('./utils/envUtil');

const envVariables = loadEnvFile('./.env');

// Database configuration setup.
const dbConfig = {
    user: envVariables.ORACLE_USER,
    password: envVariables.ORACLE_PASS,
    connectString: `${envVariables.ORACLE_HOST}:${envVariables.ORACLE_PORT}/${envVariables.ORACLE_DBNAME}`,
    poolMin: 1,
    poolMax: 3,
    poolIncrement: 1,
    poolTimeout: 60
};

// Initialize connection pool
async function initializeConnectionPool() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Connection pool started');
    } catch (err) {
        console.error('Initialization error: ' + err.message);
    }
}

async function closePoolAndExit() {
    console.log('\nTerminating');
    try {
        await oracledb.getPool().close(10); // 10 seconds grace period for connections to finish
        console.log('Pool closed');
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

initializeConnectionPool();

process
    .once('SIGTERM', closePoolAndExit)
    .once('SIGINT', closePoolAndExit);

// ----------------------------------------------------------
// Wrapper to manage OracleDB actions, simplifying connection handling.
async function withOracleDB(action) {
    let connection;
    try {
        connection = await oracledb.getConnection(); // Gets a connection from the default pool 
        return await action(connection);
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

// ----------------------------------------------------------
// Function to initialize the database (create tables and sequences)
async function initializeDatabase() {
    return await withOracleDB(async (connection) => {
        try {
            // Drop sequences first to avoid dependency issues
            const sequences = ['Notification_SEQ', 'Claim_SEQ', 'Report_SEQ', 'Item_SEQ', 'LocationInfo_SEQ', 'ItemStatus_SEQ', 'Category_SEQ', 'Users_SEQ', 'BuildingInfo_SEQ'];
            for (const seq of sequences) {
                try {
                    await connection.execute(`DROP SEQUENCE ${seq}`);
                    console.log(`Dropped sequence ${seq}`);
                } catch (err) {
                    if (err.errorNum === 2289) { // ORA-02289: sequence does not exist
                        console.log(`Sequence ${seq} does not exist, skipping drop.`);
                    } else {
                        console.error(`Error dropping sequence ${seq}: ${err.message}`);
                        throw err;
                    }
                }
            }

            // Drop tables in order to avoid foreign key constraints issues
            const tables = ['Notification', 'Claim', 'Report', 'Item', 'LocationInfo', 'BuildingInfo', 'ItemStatus', 'Category', 'Users'];
            for (const table of tables) {
                try {
                    await connection.execute(`DROP TABLE ${table} CASCADE CONSTRAINTS PURGE`);
                    console.log(`Dropped table ${table}`);
                } catch (err) {
                    if (err.errorNum === 942) { // ORA-00942: table or view does not exist
                        console.log(`Table ${table} does not exist, skipping drop.`);
                    } else {
                        console.error(`Error dropping table ${table}: ${err.message}`);
                        throw err;
                    }
                }
            }

            // Create Users table (renamed from User)
            await connection.execute(`
                CREATE TABLE Users (
                    UserID INTEGER PRIMARY KEY,
                    Name VARCHAR2(50) NOT NULL,
                    Email VARCHAR2(50) UNIQUE NOT NULL,
                    Phone VARCHAR2(15),
                    Role VARCHAR2(20) NOT NULL
                )
            `);

            // Create Category table
            await connection.execute(`
                CREATE TABLE Category (
                    CategoryID INTEGER PRIMARY KEY,
                    CategoryName VARCHAR2(20) UNIQUE NOT NULL
                )
            `);

            // Create ItemStatus table (renamed from Status)
            await connection.execute(`
                CREATE TABLE ItemStatus (
                    StatusID INTEGER PRIMARY KEY,
                    StatusDescription VARCHAR2(20) NOT NULL
                )
            `);

            // Create BuildingInfo table
            await connection.execute(`
                CREATE TABLE BuildingInfo (
                    BuildingCode VARCHAR2(4) PRIMARY KEY,
                    BuildingName VARCHAR2(50) UNIQUE NOT NULL,
                    BuildingAddress VARCHAR2(100) NOT NULL
                )
            `);

            // Create LocationInfo table
            await connection.execute(`
                CREATE TABLE LocationInfo (
                    LocationID INTEGER PRIMARY KEY,
                    BuildingCode VARCHAR2(4) NOT NULL,
                    RoomNumber INTEGER NOT NULL,
                    FOREIGN KEY (BuildingCode) REFERENCES BuildingInfo(BuildingCode),
                    UNIQUE (BuildingCode, RoomNumber)
                )
            `);

            // Create Item table
            await connection.execute(`
                CREATE TABLE Item (
                    ItemID INTEGER PRIMARY KEY,
                    Description VARCHAR2(100) NOT NULL,
                    DateReported DATE NOT NULL,
                    CategoryID INTEGER NOT NULL,
                    StatusID INTEGER NOT NULL,
                    LocationID INTEGER NOT NULL,
                    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID) ON DELETE CASCADE,
                    FOREIGN KEY (StatusID) REFERENCES ItemStatus(StatusID),
                    FOREIGN KEY (LocationID) REFERENCES LocationInfo(LocationID)
                )
            `);

            // Create Report table
            await connection.execute(`
                CREATE TABLE Report (
                    ReportID INTEGER PRIMARY KEY,
                    ReportType VARCHAR2(20) NOT NULL,
                    ReportDate DATE NOT NULL,
                    UserID INTEGER NOT NULL,
                    ItemID INTEGER NOT NULL,
                    FOREIGN KEY (UserID) REFERENCES Users(UserID),
                    FOREIGN KEY (ItemID) REFERENCES Item(ItemID) ON DELETE CASCADE
                )
            `);

            // Create Claim table
            await connection.execute(`
                CREATE TABLE Claim (
                    ClaimID INTEGER PRIMARY KEY,
                    UserID INTEGER NOT NULL,
                    ItemID INTEGER NOT NULL,
                    ClaimDate DATE NOT NULL,
                    FOREIGN KEY (UserID) REFERENCES Users(UserID),
                    FOREIGN KEY (ItemID) REFERENCES Item(ItemID)ON DELETE CASCADE,
                    UNIQUE (UserID, ItemID)
                )
            `);

            // Create Notification table
            await connection.execute(`
                CREATE TABLE Notification (
                    NotificationID INTEGER PRIMARY KEY,
                    UserID INTEGER NOT NULL,
                    ItemID INTEGER NOT NULL,
                    NotificationDate DATE NOT NULL,
                    FOREIGN KEY (UserID) REFERENCES Users(UserID),
                    FOREIGN KEY (ItemID) REFERENCES Item(ItemID)ON DELETE CASCADE,
                    UNIQUE (UserID, ItemID, NotificationDate)
                )
            `);

            // Create sequences
            await connection.execute(`CREATE SEQUENCE Users_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE Category_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE ItemStatus_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE LocationInfo_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE Item_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE Report_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE Claim_SEQ START WITH 1 INCREMENT BY 1`);
            await connection.execute(`CREATE SEQUENCE Notification_SEQ START WITH 1 INCREMENT BY 1`);

            // Insert initial data into ItemStatus table
            const initialStatuses = ['Lost', 'Found', 'Claimed', 'Unclaimed'];
            const statusIdMap = {};
            for (const status of initialStatuses) {
                const result = await connection.execute(
                    `INSERT INTO ItemStatus (StatusID, StatusDescription) VALUES (ItemStatus_SEQ.NEXTVAL, :statusDescription)
                     RETURNING StatusID INTO :statusId`,
                    {
                        statusDescription: status,
                        statusId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                    }
                );
                const statusId = result.outBinds.statusId[0];
                statusIdMap[status] = statusId;
            }

            // // Insert initial data into Users table
            // const users = [
            //     { name: 'ABC', email: 'abc@ubc.ca', phone: '123-456-890', role: 'Student' },
            //     { name: 'DEF', email: 'def@ubc.ca', phone: '123-456-890', role: 'Staff' },
            //     { name: 'GHI', email: 'ghi@ubc.ca', phone: '123-456-890', role: 'Staff' },
            //     { name: 'JKL', email: 'jkl@student.ubc.ca', phone: '123-456-890', role: 'Student' },
            //     { name: 'MNO', email: 'mno@ubc.ca', phone: '123-456-890', role: 'Staff' }
            // ];
            // const userIdMap = {};
            // for (const user of users) {
            //     const result = await connection.execute(
            //         `INSERT INTO Users (UserID, Name, Email, Phone, Role)
            //          VALUES (Users_SEQ.NEXTVAL, :name, :email, :phone, :role)
            //          RETURNING UserID INTO :userId`,
            //         {
            //             name: user.name,
            //             email: user.email,
            //             phone: user.phone,
            //             role: user.role,
            //             userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            //         }
            //     );
            //     const userId = result.outBinds.userId[0];
            //     userIdMap[user.email] = userId;
            // }

            // Insert initial data into Category table
            const categories = ['Electronics', 'Clothing', 'Accessories', 'Stationery', 'Keys'];
            const categoryIdMap = {};
            for (const category of categories) {
                const result = await connection.execute(
                    `INSERT INTO Category (CategoryID, CategoryName)
                     VALUES (Category_SEQ.NEXTVAL, :categoryName)
                     RETURNING CategoryID INTO :categoryId`,
                    {
                        categoryName: category,
                        categoryId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                    }
                );
                const categoryId = result.outBinds.categoryId[0];
                categoryIdMap[category] = categoryId;
            }

            // Insert initial data into BuildingInfo table
            const buildings = [
                { code: 'IKB', name: 'Irving K. Barber Learning Centre', address: '1961 East Mall, Vancouver, BC' },
                { code: 'DMP', name: 'Hugh Dempster Pavilion', address: '6245 Agronomy Rd, Vancouver, BC' },
                { code: 'HA', name: 'Henry Angus Building', address: '2053 Main Mall, Vancouver, BC' },
                { code: 'BUCH', name: 'Buchanan Tower', address: '1873 East Mall, Vancouver, BC' },
                { code: 'FSC', name: 'Forest Sciences Centre', address: '2424 Main Mall, Vancouver, BC' }
            ];
            for (const building of buildings) {
                await connection.execute(
                    `INSERT INTO BuildingInfo (BuildingCode, BuildingName, BuildingAddress)
                     VALUES (:code, :name, :address)`,
                    {
                        code: building.code,
                        name: building.name,
                        address: building.address
                    }
                );
            }

            // Insert initial data into LocationInfo table
            const locations = [
                { buildingCode: 'IKB', roomNumber: 1961 },
                { buildingCode: 'DMP', roomNumber: 110 },
                { buildingCode: 'HA', roomNumber: 235 },
                { buildingCode: 'BUCH', roomNumber: 200 },
                { buildingCode: 'FSC', roomNumber: 1221 }
            ];
            const locationIdList = [];
            for (const location of locations) {
                const result = await connection.execute(
                    `INSERT INTO LocationInfo (LocationID, BuildingCode, RoomNumber)
                     VALUES (LocationInfo_SEQ.NEXTVAL, :buildingCode, :roomNumber)
                     RETURNING LocationID INTO :locationId`,
                    {
                        buildingCode: location.buildingCode,
                        roomNumber: location.roomNumber,
                        locationId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                    }
                );
                const locationId = result.outBinds.locationId[0];
                locationIdList.push(locationId);
            }

            // // Insert initial data into Item table
            // const items = [
            //     {
            //         description: 'Silver MacBook Pro with UBC sticker',
            //         dateReported: '2024-10-01',
            //         category: 'Electronics',
            //         status: 'Lost',
            //         locationIndex: 0
            //     },
            //     {
            //         description: 'Black Canada Goose Jacket',
            //         dateReported: '2024-10-02',
            //         category: 'Clothing',
            //         status: 'Found',
            //         locationIndex: 1
            //     },
            //     {
            //         description: 'Gold Bracelet engraved with initials',
            //         dateReported: '2024-10-03',
            //         category: 'Accessories',
            //         status: 'Lost',
            //         locationIndex: 2
            //     },
            //     {
            //         description: 'Blue Moleskine Notebook',
            //         dateReported: '2024-10-04',
            //         category: 'Stationery',
            //         status: 'Found',
            //         locationIndex: 3
            //     },
            //     {
            //         description: 'Set of office keys with red lanyard',
            //         dateReported: '2024-10-05',
            //         category: 'Keys',
            //         status: 'Lost',
            //         locationIndex: 4
            //     }
            // ];
            // const itemIdList = [];
            // for (const item of items) {
            //     const result = await connection.execute(
            //         `INSERT INTO Item (ItemID, Description, DateReported, CategoryID, StatusID, LocationID)
            //          VALUES (Item_SEQ.NEXTVAL, :description, TO_DATE(:dateReported, 'YYYY-MM-DD'), :categoryId, :statusId, :locationId)
            //          RETURNING ItemID INTO :itemId`,
            //         {
            //             description: item.description,
            //             dateReported: item.dateReported,
            //             categoryId: categoryIdMap[item.category],
            //             statusId: statusIdMap[item.status],
            //             locationId: locationIdList[item.locationIndex],
            //             itemId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            //         }
            //     );
            //     const itemId = result.outBinds.itemId[0];
            //     itemIdList.push(itemId);
            // }

            // // Insert initial data into Report table
            // const reports = [
            //     { reportType: 'Lost', reportDate: '2024-10-01', userEmail: 'abc@ubc.ca', itemIndex: 0 },
            //     { reportType: 'Found', reportDate: '2024-10-02', userEmail: 'def@ubc.ca', itemIndex: 1 },
            //     { reportType: 'Lost', reportDate: '2024-10-03', userEmail: 'ghi@ubc.ca', itemIndex: 2 },
            //     { reportType: 'Found', reportDate: '2024-10-04', userEmail: 'jkl@student.ubc.ca', itemIndex: 3 },
            //     { reportType: 'Lost', reportDate: '2024-10-05', userEmail: 'mno@ubc.ca', itemIndex: 4 }
            // ];
            // for (const report of reports) {
            //     await connection.execute(
            //         `INSERT INTO Report (ReportID, ReportType, ReportDate, UserID, ItemID)
            //          VALUES (Report_SEQ.NEXTVAL, :reportType, TO_DATE(:reportDate, 'YYYY-MM-DD'), :userId, :itemId)`,
            //         {
            //             reportType: report.reportType,
            //             reportDate: report.reportDate,
            //             userId: userIdMap[report.userEmail],
            //             itemId: itemIdList[report.itemIndex]
            //         }
            //     );
            // }

            // // Insert initial data into Notification table
            // const notifications = [
            //     { userEmail: 'abc@ubc.ca', itemIndex: 1, notificationDate: '2024-10-11' },
            //     { userEmail: 'ghi@ubc.ca', itemIndex: 3, notificationDate: '2024-10-12' },
            //     { userEmail: 'mno@ubc.ca', itemIndex: 0, notificationDate: '2024-10-13' },
            //     { userEmail: 'def@ubc.ca', itemIndex: 4, notificationDate: '2024-10-14' },
            //     { userEmail: 'jkl@student.ubc.ca', itemIndex: 2, notificationDate: '2024-10-15' }
            // ];
            // for (const notification of notifications) {
            //     await connection.execute(
            //         `INSERT INTO Notification (NotificationID, UserID, ItemID, NotificationDate)
            //          VALUES (Notification_SEQ.NEXTVAL, :userId, :itemId, TO_DATE(:notificationDate, 'YYYY-MM-DD'))`,
            //         {
            //             userId: userIdMap[notification.userEmail],
            //             itemId: itemIdList[notification.itemIndex],
            //             notificationDate: notification.notificationDate
            //         }
            //     );
            // }

            // Commit all changes
            await connection.commit();


            return { success: true };
        } catch (err) {
            console.error(err);
            await connection.rollback();
            return { success: false, error: err.message };
        }
    });
}


// ----------------------------------------------------------
// Core functions for database operations

// User Registration
async function registerUser(name, email, phone, role) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `INSERT INTO Users (UserID, Name, Email, Phone, Role) VALUES (Users_SEQ.NEXTVAL, :name, :email, :phone, :role) RETURNING UserID INTO :userId`,
            {
                name,
                email,
                phone,
                role,
                userId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: true }
        );
        const userId = result.outBinds.userId[0];
        return { success: true, userId };
    }).catch((err) => {
        return { success: false, error: err.message };
    });
}


// Report Lost Item
async function reportLostItem(description, categoryId, locationId, userId) {
    return await withOracleDB(async (connection) => {
        
         // Check if CategoryID exists
         const categoryResult = await connection.execute(
            `SELECT CategoryID FROM Category WHERE CategoryID = :categoryId`,
            { categoryId }
        );
        if (categoryResult.rows.length === 0) {
            return { success: false, error: `CategoryID ${categoryId} does not exist.` };
        }

        // Check if LocationID exists
        const locationResult = await connection.execute(
            `SELECT LocationID FROM LocationInfo WHERE LocationID = :locationId`,
            { locationId }
        );
        if (locationResult.rows.length === 0) {
            return { success: false, error: `LocationID ${locationId} does not exist.` };
        }

        // Check if UserID exists
        const userResult = await connection.execute(
            `SELECT UserID FROM Users WHERE UserID = :userId`,
            { userId }
        );
        if (userResult.rows.length === 0) {
            return { success: false, error: `UserID ${userId} does not exist.` };
        }

        const statusResult = await connection.execute(
            `SELECT StatusID FROM ItemStatus WHERE StatusDescription = 'Lost'`
        );
        if (statusResult.rows.length === 0) {
            return { success: false, error: "Status 'Lost' not found" };
        }

        // Get StatusID for 'Lost'
        const statusId = statusResult.rows[0][0];

        // Insert into Item
        const itemResult = await connection.execute(
            `INSERT INTO Item (ItemID, Description, DateReported, CategoryID, StatusID, LocationID)
             VALUES (Item_SEQ.NEXTVAL, :description, SYSDATE, :categoryId, :statusId, :locationId)
             RETURNING ItemID INTO :itemId`,
            {
                description,
                categoryId,
                statusId,
                locationId,
                itemId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: false }
        );
        const itemId = itemResult.outBinds.itemId[0];

        // Insert into Report
        await connection.execute(
            `INSERT INTO Report (ReportID, ReportType, ReportDate, UserID, ItemID)
             VALUES (Report_SEQ.NEXTVAL, 'Lost', SYSDATE, :userId, :itemId)`,
            {
                userId,
                itemId
            },
            { autoCommit: true }
        );
        return { success: true, itemId };
    }).catch((err) => {
        return { success: false, error: err.message };
    });
}

// Report Found Item
async function reportFoundItem(description, categoryId, locationId, userId) {
    return await withOracleDB(async (connection) => {
        // Get StatusID for 'Found'
        const statusResult = await connection.execute(
            `SELECT StatusID FROM ItemStatus WHERE StatusDescription = 'Found'`
        );
        if (statusResult.rows.length === 0) {
            return { success: false, error: "Status 'Found' not found" };
        }
        const statusId = statusResult.rows[0][0];

        // Insert into Item
        const itemResult = await connection.execute(
            `INSERT INTO Item (ItemID, Description, DateReported, CategoryID, StatusID, LocationID)
             VALUES (Item_SEQ.NEXTVAL, :description, SYSDATE, :categoryId, :statusId, :locationId)
             RETURNING ItemID INTO :itemId`,
            {
                description,
                categoryId,
                statusId,
                locationId,
                itemId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: false }
        );
        const itemId = itemResult.outBinds.itemId[0];

        // Insert into Report
        await connection.execute(
            `INSERT INTO Report (ReportID, ReportType, ReportDate, UserID, ItemID)
             VALUES (Report_SEQ.NEXTVAL, 'Found', SYSDATE, :userId, :itemId)`,
            {
                userId,
                itemId
            },
            { autoCommit: true }
        );
        return { success: true, itemId };
    }).catch((err) => {
        return { success: false, error: err.message };
    });
}

// Get Lost Items
async function getLostItems() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT i.ItemID, i.Description, i.DateReported, c.CategoryName, s.StatusDescription, li.LocationID
             FROM Item i
             JOIN ItemStatus s ON i.StatusID = s.StatusID
             JOIN Category c ON i.CategoryID = c.CategoryID
             JOIN LocationInfo li ON i.LocationID = li.LocationID
             WHERE s.StatusDescription = 'Lost'`
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Get Found Items
async function getFoundItems() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT i.ItemID, i.Description, i.DateReported, c.CategoryName, s.StatusDescription, li.LocationID
             FROM Item i
             JOIN ItemStatus s ON i.StatusID = s.StatusID
             JOIN Category c ON i.CategoryID = c.CategoryID
             JOIN LocationInfo li ON i.LocationID = li.LocationID
             WHERE s.StatusDescription = 'Found'`
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Claim Item
async function claimItem(userId, itemId) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `INSERT INTO Claim (ClaimID, UserID, ItemID, ClaimDate)
             VALUES (Claim_SEQ.NEXTVAL, :userId, :itemId, SYSDATE)
             RETURNING ClaimID INTO :claimId`,
            {
                userId,
                itemId,
                claimId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            },
            { autoCommit: false }
        );

        const claimId = result.outBinds.claimId[0];

        // Update Item Status to 'Claimed'
        const statusResult = await connection.execute(
            `SELECT StatusID FROM ItemStatus WHERE StatusDescription = 'Claimed'`
        );
        if (statusResult.rows.length === 0) {
            await connection.rollback();
            return { success: false, error: "Status 'Claimed' not found" };
        }
        const statusId = statusResult.rows[0][0];

        await connection.execute(
            `UPDATE Item SET StatusID = :statusId WHERE ItemID = :itemId`,
            {
                statusId,
                itemId
            },
            { autoCommit: true }
        );

        return { success: true, claimId };
    }).catch((err) => {
        return { success: false, error: err.message };
    });
}

// Get Notifications
async function getNotifications(userId) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT NotificationID, ItemID, NotificationDate
             FROM Notification WHERE UserID = :userId`,
            [userId]
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// DELETE Operation: Delete Report and Item by UserID and ItemID
async function deleteReport(userId, itemId) {
    return await withOracleDB(async (connection) => {
        // Delete the report
        const deleteReportResult = await connection.execute(
            `DELETE FROM Report WHERE UserID = :userId AND ItemID = :itemId`,
            { userId, itemId }
        );

        // Check if any reports were deleted
        if (deleteReportResult.rowsAffected === 0) {
            await connection.execute('ROLLBACK');
            return { success: false, error: 'No report found.' };
        }

        // // Delete the item
        // const deleteItemResult = await connection.execute(
        //     `DELETE FROM Item WHERE ItemID = :itemId`,
        //     { itemId },
        //     { autoCommit: true }

        // );


        return { success: true };
    }).catch((err) => {
        console.error(err);
        return { success: false, error: err.message };
    });
}


// UPDATE Operation: Update Item Attributes
async function updateItem(itemId, attributesToUpdate) {
    return await withOracleDB(async (connection) => {
        // Build SET clause dynamically
        const setClauses = [];
        const bindParams = { itemId };

        Object.keys(attributesToUpdate).forEach((attr, index) => {
            const bindKey = `value${index}`;
            setClauses.push(`${attr} = :${bindKey}`);
            bindParams[bindKey] = attributesToUpdate[attr];
        });

        const setClause = setClauses.join(', ');

        const sql = `UPDATE Item SET ${setClause} WHERE ItemID = :itemId`;

        await connection.execute(sql, bindParams, { autoCommit: true });
        return { success: true };
    }).catch((err) => {
        return { success: false, error: err.message };
    });
}

// Function to get all items
async function getAllItems() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT ItemID, Description FROM Item`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}


// Projection and Join: Get Items by Category
async function getItemsByCategory(categoryName) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT i.ItemID, i.Description
             FROM Item i
             JOIN Category c ON i.CategoryID = c.CategoryID
             WHERE c.CategoryName = :categoryName`,
            { categoryName }
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Aggregation with GROUP BY: Get Lost Items Count Per Category
async function getLostItemsCountPerCategory() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT c.CategoryName, COUNT(*) AS LostItemCount
             FROM Item i
             JOIN Category c ON i.CategoryID = c.CategoryID
             JOIN ItemStatus s ON i.StatusID = s.StatusID
             WHERE s.StatusDescription = 'Lost'
             GROUP BY c.CategoryName`
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Aggregation with HAVING: Get Categories with Lost Items over Threshold
async function getCategoriesWithLostItemsOver(threshold) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT c.CategoryName, COUNT(*) AS LostItemCount
             FROM Item i
             JOIN Category c ON i.CategoryID = c.CategoryID
             JOIN ItemStatus s ON i.StatusID = s.StatusID
             WHERE s.StatusDescription = 'Lost'
             GROUP BY c.CategoryName
             HAVING COUNT(*) > :threshold`,
            { threshold }
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Nested Aggregation with GROUP BY: Get Top Category Per Building
async function getTopCategoryPerBuilding() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `WITH ItemCounts AS (
                SELECT li.BuildingCode, c.CategoryID, COUNT(*) AS ItemCount
                FROM Item i
                JOIN LocationInfo li ON i.LocationID = li.LocationID
                JOIN Category c ON i.CategoryID = c.CategoryID
                JOIN ItemStatus s ON i.StatusID = s.StatusID
                WHERE s.StatusDescription = 'Lost'
                GROUP BY li.BuildingCode, c.CategoryID
            ), MaxCounts AS (
                SELECT BuildingCode, MAX(ItemCount) AS MaxCount
                FROM ItemCounts
                GROUP BY BuildingCode
            )
            SELECT bi.BuildingName, c.CategoryName, ic.ItemCount
            FROM ItemCounts ic
            JOIN MaxCounts mc ON ic.BuildingCode = mc.BuildingCode AND ic.ItemCount = mc.MaxCount
            JOIN BuildingInfo bi ON ic.BuildingCode = bi.BuildingCode
            JOIN Category c ON ic.CategoryID = c.CategoryID`
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Division: Get Users Reporting All Categories
async function getUsersReportingAllCategories() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT u.UserID, u.Name
             FROM Users u
             WHERE NOT EXISTS (
                 SELECT c.CategoryID
                 FROM Category c
                 MINUS
                 SELECT DISTINCT i.CategoryID
                 FROM Item i
                 JOIN Report r ON i.ItemID = r.ItemID
                 WHERE r.UserID = u.UserID
             )`
        );
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

// Get Claims
async function getClaims() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT c.ClaimID, c.UserID, u.Name AS UserName, c.ItemID, i.Description AS ItemDescription, c.ClaimDate
             FROM Claim c
             JOIN Users u ON c.UserID = u.UserID
             JOIN Item i ON c.ItemID = i.ItemID`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const data = result.rows.map(row => [
            row.CLAIMID,
            row.USERID,
            row.USERNAME,
            row.ITEMID,
            row.ITEMDESCRIPTION,
            row.CLAIMDATE
        ]);
        return { success: true, data };
    }).catch((err) => {
        console.error(err);
        return { success: false, error: err.message };
    });
}

// Selection Operation: Search Items
async function searchItems(conditions, logic) {
    return await withOracleDB(async (connection) => {
        // Build WHERE clause dynamically
        const whereClauses = [];
        const bindParams = {};

        conditions.forEach((condition, index) => {
            const attr = condition.attribute;
            const op = condition.operator.toUpperCase();
            const valueKey = `value${index}`;
            whereClauses.push(`${attr} ${op} :${valueKey}`);
            bindParams[valueKey] = condition.value;
        });

        const whereClause = whereClauses.join(` ${logic.toUpperCase()} `); // 'AND' or 'OR'

        const sql = `SELECT * FROM Item${whereClause ? ' WHERE ' + whereClause : ''}`;

        // // Optional: Debugging statements
        // console.log('Generated SQL:', sql);
        // console.log('Bind Parameters:', bindParams);

        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows;
    }).catch((err) => {
        console.error(err);
        throw err; // Re-throw the error to be handled elsewhere if needed
    });
}


// Projection Operation: Get Items with Selected Attributes
async function getItemsWithAttributes(attributes) {
    return await withOracleDB(async (connection) => {
        const selectClause = attributes.join(', ');
        const sql = `SELECT ${selectClause} FROM Item`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}



module.exports = {
    initializeDatabase,
    registerUser,
    reportLostItem,
    reportFoundItem,
    getLostItems,
    getFoundItems,
    claimItem,
    getNotifications,
    deleteReport, // Added DELETE operation
    getItemsByCategory, // Added Projection and Join
    getLostItemsCountPerCategory, // Added Aggregation with GROUP BY
    getCategoriesWithLostItemsOver, // Added Aggregation with HAVING
    getTopCategoryPerBuilding, // Added Nested Aggregation with GROUP BY
    getUsersReportingAllCategories, // Added Division
    getClaims,
    getAllItems,
    searchItems,
    getItemsWithAttributes
};
