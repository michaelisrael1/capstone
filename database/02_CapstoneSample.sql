INSERT INTO Person VALUES
(1,'Alice','Johnson','Student','ACTIVE','Central High',NULL,'2024-08-01',NULL,TRUE,'Good academic standing'),
(2,'Bob','Smith','Staff','ACTIVE',NULL,'Case Management','2022-01-10',NULL,TRUE,'Senior coordinator'),
(3,'Charlie','Brown','Client','ACTIVE',NULL,NULL,'2023-05-01',NULL,FALSE,'Requires support services'),
(4,'Diana','Miller','Staff','ACTIVE',NULL,'Administration','2020-03-15',NULL,TRUE,'System administrator'),
(5,'Ethan','Davis','Student','ACTIVE','West High',NULL,'2025-01-10',NULL,TRUE,'New transfer student'),
(6,'Fiona','Garcia','Client','INACTIVE',NULL,NULL,'2021-09-01','2024-09-01',FALSE,'Completed program'),
(7,'George','Wilson','Staff','ACTIVE',NULL,'Case Management','2019-06-20',NULL,TRUE,'Field coordinator'),
(8,'Hannah','Moore','Staff','ACTIVE',NULL,'Case Management','2021-11-05',NULL,TRUE,'New coordinator');


INSERT INTO Address VALUES
(1,'123 Main St','Omaha','NE','68102'),
(2,'55 Oak Ave','Council Bluffs','IA','51501'),
(3,'890 Pine Rd','Lincoln','NE','68508'),
(4,'42 Maple Dr','Omaha','NE','68104'),
(5,'777 Cedar Ln','Bellevue','NE','68005');

INSERT INTO PersonAddress VALUES
(1,1,'mailing'),
(2,2,'work'),
(3,3,'mailing'),
(4,4,'work'),
(5,5,'mailing'),
(6,2,'mailing'),
(7,3,'work');

-- -----------------------------------------
-- TAG DEFINITIONS
-- -----------------------------------------
INSERT INTO Tag (tag_code, tag_label) VALUES
('ds', 'Day Services'),
('se', 'Special Education'),
('vr', 'Vocational Rehabilitation'),
('so', 'Special Olympics');

-- -----------------------------------------
-- RISK DEFINITIONS
-- -----------------------------------------
INSERT INTO Risk (risk_code, risk_label) VALUES
('allergy', 'Allergy'),
('sensory', 'Sensory Sensitivity'),
('mobility', 'Mobility Assistance'),
('behavioral', 'Behavioral Concerns'),
('communication', 'Communication Support'),
('seizure', 'Seizure Risk'),
('medication', 'Medication Monitoring');

-- -----------------------------------------
-- PERSON TAG ASSIGNMENTS
-- -----------------------------------------
-- Alice Johnson (Student)
-- tags: ["ds", "se", "vr"]
INSERT INTO PersonTag (person_id, tag_id)
SELECT 1, tag_id FROM Tag WHERE tag_code = 'ds';

INSERT INTO PersonTag (person_id, tag_id)
SELECT 1, tag_id FROM Tag WHERE tag_code = 'se';

INSERT INTO PersonTag (person_id, tag_id)
SELECT 1, tag_id FROM Tag WHERE tag_code = 'vr';


-- Charlie Brown (Client)
-- tags: ["so", "se", "vr"]
INSERT INTO PersonTag (person_id, tag_id)
SELECT 3, tag_id FROM Tag WHERE tag_code = 'so';

INSERT INTO PersonTag (person_id, tag_id)
SELECT 3, tag_id FROM Tag WHERE tag_code = 'se';

INSERT INTO PersonTag (person_id, tag_id)
SELECT 3, tag_id FROM Tag WHERE tag_code = 'vr';


-- Ethan Davis (Student)
-- tags: ["ds", "se", "so"]
INSERT INTO PersonTag (person_id, tag_id)
SELECT 5, tag_id FROM Tag WHERE tag_code = 'ds';

INSERT INTO PersonTag (person_id, tag_id)
SELECT 5, tag_id FROM Tag WHERE tag_code = 'se';

INSERT INTO PersonTag (person_id, tag_id)
SELECT 5, tag_id FROM Tag WHERE tag_code = 'so';


-- Fiona Garcia (Client)
-- tags: ["vr"]
INSERT INTO PersonTag (person_id, tag_id)
SELECT 6, tag_id FROM Tag WHERE tag_code = 'vr';


-- -----------------------------------------
-- PERSON RISK ASSIGNMENTS
-- -----------------------------------------
-- Alice Johnson
-- risks: ["allergy", "sensory", "mobility"]
INSERT INTO PersonRisk (person_id, risk_id)
SELECT 1, risk_id FROM Risk WHERE risk_code = 'allergy';

INSERT INTO PersonRisk (person_id, risk_id)
SELECT 1, risk_id FROM Risk WHERE risk_code = 'sensory';

INSERT INTO PersonRisk (person_id, risk_id)
SELECT 1, risk_id FROM Risk WHERE risk_code = 'mobility';


-- Charlie Brown
-- risks: ["behavioral", "communication"]
INSERT INTO PersonRisk (person_id, risk_id)
SELECT 3, risk_id FROM Risk WHERE risk_code = 'behavioral';

INSERT INTO PersonRisk (person_id, risk_id)
SELECT 3, risk_id FROM Risk WHERE risk_code = 'communication';


-- Ethan Davis
-- risks: ["seizure", "medication"]
INSERT INTO PersonRisk (person_id, risk_id)
SELECT 5, risk_id FROM Risk WHERE risk_code = 'seizure';

INSERT INTO PersonRisk (person_id, risk_id)
SELECT 5, risk_id FROM Risk WHERE risk_code = 'medication';


-- Fiona Garcia
-- risks: ["mobility"]
INSERT INTO PersonRisk (person_id, risk_id)
SELECT 6, risk_id FROM Risk WHERE risk_code = 'mobility';

INSERT INTO Phone (phone_id, person_id, phone_number, phone_type) VALUES
(1, 1,'402-111-1111','personal'),
(2, 2,'402-222-2222','work'),
(3, 3,'402-333-3333','personal'),
(4, 4,'402-444-4444','work'),
(5, 5,'402-555-5555','personal'),
(6, 6,'402-666-6666','personal'),
(7, 7,'402-777-7777','work');

INSERT INTO Email (email_id, person_id, email_address, email_type) VALUES
(1, 1,'head.coordinator@madonna.org','school'),
(2, 2,'director@madonna.org','work'),
(3, 3,'coordinator@madonna.org','personal'),
(4, 4,'staff@madonna.org','work'),
(5, 5,'program.coordinator@madonna.org','school'),
(6, 6,'student@madonna.org','personal'),
(7, 7,'guardian@madonna.org','work');

INSERT INTO ContactRelationship VALUES
(1,1,2,'Coordinator',TRUE),
(2,5,2,'Coordinator',TRUE),
(3,3,7,'CaseWorker',TRUE),
(4,6,7,'CaseWorker',FALSE);

INSERT INTO UserAccount (user_id, person_id, email_id, password_hash, role, is_active, is_locked) VALUES
(1, 1, 1, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Head Coordinator', TRUE, FALSE),
(2, 2, 2, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Director', TRUE, FALSE),
(3, 3, 3, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Program Coordinator', TRUE, FALSE),
(4, 4, 4, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Staff', TRUE, FALSE),
(5, 5, 5, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Program Coordinator', TRUE, FALSE),
(6, 6, 6, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Student', TRUE, FALSE),
(7, 7, 7, '$2a$12$UB1FCvBZq90F8nQ88Iyb9OsTJfP1OHRvAVWlBgHpGQZsx6FeYqgZu', 'Guardian', TRUE, FALSE);

INSERT INTO Employer VALUES
(1,'Helping Hands Org',1),
(2,'Youth Services Inc',2),
(3,'Community Support Group',3);

INSERT INTO Employment VALUES
(1,2,1,'Coordinator','Jane Manager','402-999-1111'),
(2,4,2,'System Admin','Mark Lead','402-999-2222'),
(3,7,3,'Field Coordinator','Sara Lead','402-999-3333');

INSERT INTO CoordinatorAssignment VALUES
(1,1,2),
(2,5,2),
(3,3,7),
(4,6,7);

INSERT INTO Service VALUES
(1,'CI'),
(2,'DS'),
(3,'SFL'),
(4,'MH');

INSERT INTO PersonService VALUES
(1,1),
(1,2),
(3,3),
(5,1),
(6,4);

INSERT INTO Announcements VALUES
('a1','Bob Smith','Coordinator','bob@agency.org',
'Welcome to the new program updates!','staff,clients',
'[]','[]','[]',
NULL,'normal',NOW(),NOW()),

('a2','Diana Miller','Admin','diana@admin.org',
'Scheduled maintenance this weekend.','all',
'[]','[]','[]',
NULL,'high',NOW(),NOW()),

('a3','George Wilson','Coordinator','george@agency.org',
'New client onboarding procedures released.','staff',
'[]','[]','[]',
NULL,'normal',NOW(),NOW());