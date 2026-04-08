-- Sample Data for every table.
INSERT INTO Person 
(first_name, last_name, stakeholder_type, status, role, school, staff_setting, start_date, media_consent, notes)
VALUES
('Tabitha', 'Keating', 'Staff', 'ACTIVE', 'Staff - Director', NULL, 'Admin', NULL, TRUE, NULL),
('Peter', 'Griffin', 'Student', 'ACTIVE', 'Elementary', 'SRB', NULL, NULL, TRUE, NULL),
('Jon', 'Smith', 'Client', 'ACTIVE', 'Adult Services', NULL, NULL, '2026-01-01', TRUE, NULL),

-- Contacts
('Eric', 'Keating', 'Contact', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL),
('Rita', 'Griffin', 'Contact', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL),
('Travis', 'Griffin', 'Contact', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL),
('Sally', 'Smith', 'Contact', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL),
('Steve', 'Smith', 'Contact', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO Address (street, city, state, zip) VALUES
('1234 Rock Rd', 'Omaha', 'NE', '12345'),
('1234 S 124th Street', 'Omaha', 'NE', '12345'),
('117 Roanoke Blvd', 'Omaha', 'NE', '12345'),
('1234 1st Ave', 'Omaha', 'NE', '12345'),
('1234 S 72nd St', 'Omaha', 'NE', '12345');

INSERT INTO PersonAddress VALUES
(1, 1, 'mailing'),
(2, 2, 'mailing'),
(2, 3, 'secondary_contact'),
(3, 4, 'mailing'),
(3, 5, 'employer');

INSERT INTO Phone (person_id, phone_number, phone_type) VALUES
(1, '555-555-1247', 'work'),
(2, '402-123-1234', 'contact'),
(3, '555-555-1234', 'personal'),
(4, '555-555-1238', 'contact'),
(7, '555-555-1235', 'contact'),
(8, '555-555-1236', 'contact');

INSERT INTO Email (person_id, email_address, email_type) VALUES
(1, 'tkeating@madonnaalliance.org', 'work'),
(3, 'jsmith@gmail.com', 'personal'),
(4, 'ekeating@gmail.com', 'contact'),
(5, 'rita@yahoo.com', 'contact'),
(6, 'tgriffin@yahoo.com', 'contact'),
(7, 'ssmith@gmail.com', 'contact');

INSERT INTO ContactRelationship 
(person_id, contact_person_id, relationship_type, is_primary)
VALUES
(1, 4, 'Spouse', TRUE),
(2, 5, 'Parent', TRUE),
(2, 6, 'Parent', FALSE),
(3, 7, 'Mother', TRUE),
(3, 8, 'Father', FALSE);

INSERT INTO Employer (name, address_id) VALUES
('McDonalds', 5);

INSERT INTO Employment 
(person_id, employer_id, position, manager_name, manager_phone)
VALUES
(3, 1, 'Dishwasher', 'James O''Malley', '555-555-1234');

-- Example: Jon Smith assigned to Tabitha Keating
INSERT INTO CoordinatorAssignment (person_id, coordinator_id)
VALUES (3, 1);

-- Example services
INSERT INTO PersonService VALUES
(1, 10), -- Tabitha → SO
(2, 10), -- Peter → SO
(3, 1),  -- Jon → CI
(3, 7),  -- Jon → RP
(3, 9);  -- Jon → VR

-- Sample Queries for every table.
SELECT * FROM Person;

-- Select people and their address
SELECT p.first_name, p.last_name, a.street, a.city, a.state, a.zip
FROM Person p
JOIN PersonAddress pa ON p.person_id = pa.person_id
JOIN Address a ON pa.address_id = a.address_id
WHERE pa.address_type = 'mailing';

-- Select phone numbers for a person
SELECT p.first_name, p.last_name, ph.phone_number
FROM Person p
JOIN Phone ph ON p.person_id = ph.person_id
WHERE p.last_name = 'Smith';

-- Select Emails
SELECT p.first_name, e.email_address
FROM Person p
JOIN Email e ON p.person_id = e.person_id;

-- Select Contacts
SELECT 
    p.first_name AS person,
    c.first_name AS contact,
    cr.relationship_type,
    cr.is_primary
FROM ContactRelationship cr
JOIN Person p ON cr.person_id = p.person_id
JOIN Person c ON cr.contact_person_id = c.person_id;

-- Select employment
SELECT 
    p.first_name,
    e.position,
    emp.name AS employer,
    e.manager_name
FROM Employment e
JOIN Person p ON e.person_id = p.person_id
JOIN Employer emp ON e.employer_id = emp.employer_id;

-- Select Coordinator
SELECT 
    p.first_name AS client,
    c.first_name AS coordinator
FROM CoordinatorAssignment ca
JOIN Person p ON ca.person_id = p.person_id
JOIN Person c ON ca.coordinator_id = c.person_id;

-- Select services
SELECT 
    p.first_name,
    s.service_code
FROM PersonService ps
JOIN Person p ON ps.person_id = p.person_id
JOIN Service s ON ps.service_id = s.service_id;

-- Full spreadsheet
SELECT 
    p.first_name,
    p.last_name,
    p.stakeholder_type,
    p.role,
    a.street,
    a.city,
    a.state,
    a.zip,
    ph.phone_number,
    e.email_address,
    c.first_name AS primary_contact,
    cr.relationship_type
FROM Person p
LEFT JOIN PersonAddress pa 
    ON p.person_id = pa.person_id AND pa.address_type = 'mailing'
LEFT JOIN Address a 
    ON pa.address_id = a.address_id
LEFT JOIN Phone ph 
    ON p.person_id = ph.person_id
LEFT JOIN Email e 
    ON p.person_id = e.person_id
LEFT JOIN ContactRelationship cr 
    ON p.person_id = cr.person_id AND cr.is_primary = TRUE
LEFT JOIN Person c 
    ON cr.contact_person_id = c.person_id;