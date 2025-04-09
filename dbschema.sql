-- Users Table (Unified for hosts and artists)
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100) UNIQUE,
    profile_picture VARCHAR(255),
    location_id INTEGER REFERENCES Locations(id),
    bio TEXT,
    host_bio TEXT,
    is_artist BOOLEAN DEFAULT FALSE,
    artist_type VARCHAR(50),
    budget NUMERIC(10, 2),
    host_rating NUMERIC(3, 2),
    host_review_count INTEGER DEFAULT 0,
    artist_rating NUMERIC(3, 2),
    artist_review_count INTEGER DEFAULT 0,
    youtube_id VARCHAR(255),
    youtube_display BOOLEAN DEFAULT FALSE,
    instagram_username VARCHAR(255),
    instagram_display BOOLEAN DEFAULT FALSE,
    facebook_id VARCHAR(255),
    facebook_display BOOLEAN DEFAULT FALSE,
    x_username VARCHAR(255),
    x_display BOOLEAN DEFAULT FALSE,
    device_token VARCHAR(255)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth_Tokens Table (OAuth and social media tokens)
CREATE TABLE Auth_Tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id),
    platform VARCHAR(20),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE Categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subcategories Table
CREATE TABLE Subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES Categories(id),
    name VARCHAR(50) NOT NULL,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User_Categories (Maps users to categories)
CREATE TABLE User_Categories (
    user_id INTEGER REFERENCES Users(id),
    category_id INTEGER REFERENCES Categories(id),
    PRIMARY KEY (user_id, category_id)
);

-- User_Subcategories (Maps users to subcategories)
CREATE TABLE User_Subcategories (
    user_id INTEGER REFERENCES Users(id),
    subcategory_id INTEGER REFERENCES Subcategories(id),
    PRIMARY KEY (user_id, subcategory_id)
);

-- Locations Table (City-level locations)
CREATE TABLE Locations (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255),
    city VARCHAR(100),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events Table (With exact venue coordinates and city reference)
CREATE TABLE Events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    banner VARCHAR(255),
    date_time TIMESTAMP NOT NULL,
    venue TEXT,
    venue_address VARCHAR(255),
    venue_latitude NUMERIC(10, 8),
    venue_longitude NUMERIC(11, 8),
    location_id INTEGER REFERENCES Locations(id),
    status VARCHAR(20) NOT NULL,
    type VARCHAR(50),
    budget_min NUMERIC(10, 2),
    budget_max NUMERIC(10, 2),
    host_id INTEGER REFERENCES Users(id),
    is_draft BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event_Categories (Maps events to categories)
CREATE TABLE Event_Categories (
    event_id INTEGER REFERENCES Events(id),
    category_id INTEGER REFERENCES Categories(id),
    PRIMARY KEY (event_id, category_id)
);

-- Event_Subcategories (Maps events to subcategories)
CREATE TABLE Event_Subcategories (
    event_id INTEGER REFERENCES Events(id),
    subcategory_id INTEGER REFERENCES Subcategories(id),
    PRIMARY KEY (event_id, subcategory_id)
);

-- Event_Applications Table (Applications and invites)
CREATE TABLE Event_Applications (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES Events(id),
    artist_id INTEGER REFERENCES Users(id),
    status VARCHAR(20) NOT NULL,
    invited_by_host BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE Bookings (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES Events(id),
    artist_id INTEGER REFERENCES Users(id),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio_Items Table
CREATE TABLE Portfolio_Items (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER REFERENCES Users(id),
    media_type VARCHAR(20),
    media_url VARCHAR(255),
    thumbnail VARCHAR(255),
    source VARCHAR(20),
    access_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE Notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id),
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    type VARCHAR(20) NOT NULL,
    related_id INTEGER,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table (Updated for host/artist feedback tied to events)
CREATE TABLE Reviews (
    id SERIAL PRIMARY KEY,
    reviewer_id INTEGER REFERENCES Users(id),
    user_id INTEGER REFERENCES Users(id), -- For host/artist reviews
    rating NUMERIC(3, 2) NOT NULL,
    comment TEXT,
    type VARCHAR(20) NOT NULL, -- "HOST", "ARTIST", "EVENT" (EVENT reserved for future)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

-- Favorites Table
CREATE TABLE Favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id),
    event_id INTEGER REFERENCES Events(id),
    artist_id INTEGER REFERENCES Users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_favorite_type CHECK (event_id IS NOT NULL OR artist_id IS NOT NULL)
);

-- Logs Table (Includes consent proof for signup)
CREATE TABLE Logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE Reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES Users(id),
    user_id INTEGER REFERENCES Users(id), -- For artist/host reports
    event_id INTEGER REFERENCES Events(id), -- For event reports
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_report_target CHECK (user_id IS NOT NULL OR event_id IS NOT NULL)
);

-- Chat_Conversations Table
CREATE TABLE Chat_Conversations (
    id VARCHAR(50) PRIMARY KEY,
    user1_id INTEGER REFERENCES Users(id),
    user2_id INTEGER REFERENCES Users(id),
    last_message_text TEXT,
    last_message_timestamp TIMESTAMP,
    last_message_sender_id INTEGER REFERENCES Users(id),
    last_message_is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user1_id, user2_id)
);

-- Messages Table
CREATE TABLE Messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(50) REFERENCES Chat_Conversations(id),
    sender_id INTEGER REFERENCES Users(id),
    text TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);