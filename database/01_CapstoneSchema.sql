-- 1. PERSON
CREATE TABLE Person (
    person_id INT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    stakeholder_type VARCHAR(50),   -- Student, Client, Staff
    status VARCHAR(50),             -- ACTIVE, INACTIVE
    role VARCHAR(100),
    school VARCHAR(150),
    staff_setting VARCHAR(150),
    start_date DATE,
    end_date DATE,
    media_consent BOOLEAN,
    notes TEXT
);

-- 2. ADDRESS
CREATE TABLE Address (
    address_id INT PRIMARY KEY,
    street VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20)
);

-- 3. PERSON ADDRESS 
CREATE TABLE PersonAddress (
    person_id INT,
    address_id INT,
    address_type VARCHAR(50), -- mailing, employer, contact, etc.
    PRIMARY KEY (person_id, address_id, address_type),
    FOREIGN KEY (person_id) REFERENCES Person(person_id),
    FOREIGN KEY (address_id) REFERENCES Address(address_id)
);

-- 4. PHONE
CREATE TABLE Phone (
    phone_id INT PRIMARY KEY,
    person_id INT,
    phone_number VARCHAR(20),
    phone_type VARCHAR(50), -- personal, work, contact
    FOREIGN KEY (person_id) REFERENCES Person(person_id)
);

-- 5. EMAIL
CREATE TABLE Email (
    email_id INT PRIMARY KEY,
    person_id INT,
    email_address VARCHAR(150),
    email_type VARCHAR(50),
    FOREIGN KEY (person_id) REFERENCES Person(person_id)
);

-- 6. CONTACT RELATIONSHIP
CREATE TABLE ContactRelationship (
    relationship_id INT PRIMARY KEY,
    person_id INT,          -- main person (student/client/staff)
    contact_person_id INT,  -- the related contact
    relationship_type VARCHAR(50), -- Parent, Spouse, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (person_id) REFERENCES Person(person_id),
    FOREIGN KEY (contact_person_id) REFERENCES Person(person_id)
);

-- 7. USER ACCOUNT
CREATE TABLE UserAccount (
    user_id INT PRIMARY KEY,

    person_id INT NOT NULL,
    email_id INT NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(50),

    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    last_login TIMESTAMP,

    FOREIGN KEY (person_id) REFERENCES Person(person_id),
    FOREIGN KEY (email_id) REFERENCES Email(email_id)
);

-- 8. EMPLOYER
CREATE TABLE Employer (
    employer_id INT PRIMARY KEY,
    name VARCHAR(150),
    address_id INT,
    FOREIGN KEY (address_id) REFERENCES Address(address_id)
);

-- 9. EMPLOYMENT
CREATE TABLE Employment (
    employment_id INT PRIMARY KEY,
    person_id INT,
    employer_id INT,
    position VARCHAR(100),
    manager_name VARCHAR(150),
    manager_phone VARCHAR(20),
    FOREIGN KEY (person_id) REFERENCES Person(person_id),
    FOREIGN KEY (employer_id) REFERENCES Employer(employer_id)
);

-- 10. COORDINATOR ASSIGNMENT
CREATE TABLE CoordinatorAssignment (
    assignment_id INT PRIMARY KEY,
    person_id INT,
    coordinator_id INT,
    FOREIGN KEY (person_id) REFERENCES Person(person_id),
    FOREIGN KEY (coordinator_id) REFERENCES Person(person_id)
);

-- 11. SERVICE
CREATE TABLE Service (
    service_id INT PRIMARY KEY,
    service_code VARCHAR(10) UNIQUE -- CI, DS, SFL, etc.
);

-- 12. PERSON SERVICE
CREATE TABLE PersonService (
    person_id INT,
    service_id INT,
    PRIMARY KEY (person_id, service_id),
    FOREIGN KEY (person_id) REFERENCES Person(person_id),
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);

-- 12. ANNOUNCEMENTS
CREATE TABLE Announcements (
    announcement_id VARCHAR(64) PRIMARY KEY,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(100) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    audience_tags TEXT,
    attachments LONGTEXT,
    likes LONGTEXT,
    comments LONGTEXT,
    expires_at DATETIME NULL,
    importance VARCHAR(20) DEFAULT 'normal',
    created_at DATETIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

