# RecoverEase

## Table of Contents

- [Introduction](#introduction)
- [Project Description](#project-description)
- [Features](#features)
- [Technology Stack](#technology-stack)<!-- - [Usage](#usage) --> <!-- - [Database Schema](#database-schema) - [Project Timeline](#project-timeline) -->
<!-- - [Contributors](#contributors) -->
<!-- - [Acknowledgments](#acknowledgments) -->

## **Introduction**  
This project is developed as part of CPSC 304 at the University of British Columbia. The primary objective is to design and implement a comprehensive Lost and Found management system tailored for a university campus.  

---

## **Project Description**  
The Lost and Found Management System streamlines the entire process of managing lost and found items on campus. It enables users to report and track lost items, log found items, and receive automated notifications when a potential match is identified based on shared attributes like item description and location. By leveraging advanced database operations and a responsive design, the system enhances the efficiency of traditional methods, reducing the time required to reunite items with their rightful owners.  

---

## **Features**  
1. **User Management**  
   - Users can register as either students or staff members and manage their profiles.  

2. **Item Reporting**  
   - Report lost or found items with comprehensive descriptions, including categories, location, and date.  

3. **Item Tracking and Search**  
   - Search for items using dynamic filters and track the status of reported items in real-time.  

4. **Automated Notifications**  
   - Users receive real-time notifications for **potential matches** based on item attributes, significantly improving reunification efficiency.  

5. **Claims Management**  
   - Users can claim items, and the system automatically updates the item's status to "Claimed."  

6. **Analytics and Insights**  
   - Advanced database operations, such as **aggregation**, **grouping**, and **dynamic queries**, provide insights like lost item counts by category or top categories per building.  

---

## **Technology Stack**  

- **Backend:** SQL, Express.js, Node.js – for robust server-side logic and database interactions.  
- **Frontend:** HTML – for building a user-friendly and responsive interface.  
- **Database:** Oracle Relational Database Management System (RDBMS) – ensuring secure and efficient data handling.  
- **Version Control:** Git – enabling collaborative code development and streamlined change tracking.  

---

## **Key Functionalities Powered by SQL**  
- **Aggregation and Analytics:** Query insights into lost item counts by category, or top categories per building using advanced **GROUP BY** and nested queries.  
- **Dynamic Search and Updates:** Implement dynamic filters to search items or update item attributes.  
- **User Reporting Insights:** Identify users who report items across all categories using division operations.  

This system demonstrates the effective application of database design principles, SQL query optimization, and backend development techniques.
