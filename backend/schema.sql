-- Cybersecurity Teaching Game Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    order_num INTEGER UNIQUE NOT NULL,
    content_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT order_num_range CHECK (order_num >= 1 AND order_num <= 6)
);

CREATE INDEX idx_levels_order ON levels(order_num);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, level_id),
    CONSTRAINT score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT attempts_positive CHECK (attempts >= 0),
    CONSTRAINT time_spent_positive CHECK (time_spent >= 0)
);

CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_level ON user_progress(level_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT correct_answer_range CHECK (correct_answer >= 0 AND correct_answer <= 3)
);

CREATE INDEX idx_quiz_questions_level ON quiz_questions(level_id);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_spent INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT time_spent_positive CHECK (time_spent >= 0)
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_level ON quiz_attempts(level_id);
CREATE INDEX idx_quiz_attempts_date ON quiz_attempts(created_at);

-- Initial levels
INSERT INTO levels (title, description, order_num, content_data) VALUES
('Level 1: Password Security', 'Learn about password security, common attacks, and best practices for creating strong passwords.', 1, '{"difficulty": "beginner", "topics": ["passwords", "brute-force", "dictionary-attacks"]}'),
('Level 2: Phishing Detection', 'Understand how phishing attacks work and learn to identify suspicious emails and websites.', 2, '{"difficulty": "beginner", "topics": ["phishing", "social-engineering", "email-security"]}'),
('Level 3: Network Security', 'Explore network fundamentals, firewalls, and secure communication protocols.', 3, '{"difficulty": "intermediate", "topics": ["networks", "firewalls", "encryption"]}'),
('Level 4: Data Encryption', 'Learn how encryption protects data and how to share files securely.', 4, '{"difficulty": "intermediate", "topics": ["encryption", "secure-sharing", "end-to-end"]}'),
('Level 5: Social Engineering', 'Recognize manipulation tactics and verify suspicious requests safely.', 5, '{"difficulty": "intermediate", "topics": ["social-engineering", "verification", "scams"]}'),
('Level 6: Secure Browsing & 2FA', 'Identify safe websites and enable two-factor authentication to secure accounts.', 6, '{"difficulty": "advanced", "topics": ["https", "safe-browsing", "2fa"]}')
ON CONFLICT (order_num) DO NOTHING;

-- Sample quiz questions for Level 1
INSERT INTO quiz_questions (level_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1, 'Which of the following is the strongest password?', 'password123', 'P@ssw0rd!', 'Tr0ub4dor&3', 'correct horse battery staple', 2, 'A strong password combines upper and lower case letters, numbers, and special characters. Tr0ub4dor&3 meets these criteria and is harder to crack than simple words or common substitutions.'),
(1, 'What is a brute-force attack?', 'A physical attack on computer hardware', 'Trying every possible password combination', 'Sending spam emails to users', 'Installing malware on a system', 1, 'A brute-force attack systematically tries every possible password combination until the correct one is found. This is why longer, more complex passwords are more secure.'),
(1, 'How often should you change your passwords for critical accounts?', 'Never', 'Every day', 'Every 3-6 months or after a suspected breach', 'Every 5 years', 2, 'Security experts recommend changing passwords every 3-6 months for critical accounts, or immediately if you suspect a breach. This limits the window of opportunity for attackers.'),
(1, 'What is two-factor authentication (2FA)?', 'Using two different passwords', 'Requiring two forms of verification to log in', 'Having two user accounts', 'Logging in twice', 1, 'Two-factor authentication requires two different forms of verification (something you know + something you have/are) to access an account, significantly improving security.')
ON CONFLICT DO NOTHING;

-- Sample quiz questions for Level 2 (Phishing Detection)
INSERT INTO quiz_questions (level_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2, 'Which of the following is a common sign of a phishing email?', 'Professional company logo', 'Urgent language demanding immediate action', 'Personalized greeting with your name', 'Digital signature from the sender', 1, 'Phishing emails often create a sense of urgency to pressure victims into acting quickly without thinking. Legitimate companies rarely demand immediate action through email.'),
(2, 'What should you do if you receive a suspicious email asking you to verify your account?', 'Click the link and enter your credentials', 'Reply with your account information', 'Contact the company directly through their official website or phone number', 'Forward it to all your contacts', 2, 'Never click links in suspicious emails. Instead, contact the company directly using official contact information from their website to verify if the request is legitimate.'),
(2, 'What is spear phishing?', 'A type of malware that spreads through networks', 'Targeted phishing attacks aimed at specific individuals or organizations', 'Fishing for passwords using brute-force attacks', 'A legitimate email marketing technique', 1, 'Spear phishing is a targeted attack where attackers research specific individuals or organizations to create convincing, personalized phishing messages that are harder to detect.'),
(2, 'Which URL is most likely to be a phishing site?', 'https://www.paypal.com', 'https://www.paypa1.com', 'https://login.paypal.com', 'https://paypal.com', 1, 'The URL paypa1.com uses the number "1" instead of the letter "l" to mimic PayPal. Always check URLs carefully for misspellings or character substitutions that indicate fake websites.')
ON CONFLICT DO NOTHING;

-- Sample quiz questions for Level 3 (Network Security)
INSERT INTO quiz_questions (level_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(3, 'What is the primary purpose of a firewall?', 'To encrypt all network traffic', 'To monitor and control incoming and outgoing network traffic', 'To speed up internet connection', 'To scan for viruses in files', 1, 'A firewall acts as a barrier between trusted and untrusted networks, monitoring and controlling traffic based on predetermined security rules to protect against unauthorized access.'),
(3, 'Which protocol provides secure communication over the internet?', 'HTTP', 'FTP', 'HTTPS', 'SMTP', 2, 'HTTPS (HyperText Transfer Protocol Secure) uses SSL/TLS encryption to secure communication between web browsers and servers, protecting data from interception and tampering.'),
(3, 'What does VPN stand for and what does it do?', 'Very Private Network - it speeds up your connection', 'Virtual Private Network - it creates a secure, encrypted connection over the internet', 'Verified Public Network - it allows public access to private files', 'Visual Protocol Network - it improves video streaming', 1, 'A VPN creates an encrypted tunnel for your internet traffic, protecting your data from eavesdropping and masking your IP address to provide privacy and security on public networks.'),
(3, 'What is the difference between symmetric and asymmetric encryption?', 'Symmetric is faster, asymmetric is more secure', 'Symmetric uses one key for both encryption and decryption, asymmetric uses a public and private key pair', 'Symmetric is for files, asymmetric is for networks', 'There is no difference, they are the same', 1, 'Symmetric encryption uses a single shared key for both encryption and decryption, while asymmetric encryption uses a public key for encryption and a separate private key for decryption, enabling secure key exchange.')
ON CONFLICT DO NOTHING;

-- Sample quiz questions for Level 4 (Data Encryption)
INSERT INTO quiz_questions (level_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(4, 'What does encryption do?', 'Deletes sensitive data', 'Turns data into unreadable text without a key', 'Backs up files automatically', 'Compresses files to save space', 1, 'Encryption converts readable data into unreadable ciphertext that requires a key to restore.'),
(4, 'Why should you share a file password separately from the file?', 'It makes the file upload faster', 'It reduces risk if one channel is compromised', 'It removes the need for encryption', 'It makes the password easier to guess', 1, 'Separating the password from the file reduces the chance an attacker gets both.'),
(4, 'Which is the safest way to share a sensitive file?', 'Public cloud link with no password', 'Unencrypted email attachment', 'Encrypted file with a strong password', 'Posting the file on social media', 2, 'Encrypting the file with a strong password is far safer than sharing it publicly or unencrypted.'),
(4, 'End-to-end encryption means...', 'Only the sender and recipient can read the data', 'The internet is always safe', 'Passwords are not required', 'Files never leave your device', 0, 'End-to-end encryption ensures only intended parties can decrypt the data.')
ON CONFLICT DO NOTHING;

-- Sample quiz questions for Level 5 (Social Engineering)
INSERT INTO quiz_questions (level_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(5, 'What is social engineering?', 'A software vulnerability scan', 'Manipulating people to reveal information', 'A type of firewall rule', 'A secure login method', 1, 'Social engineering tricks people into giving up sensitive information or access.'),
(5, 'Someone claiming to be IT asks for your password. What should you do?', 'Share it quickly', 'Refuse and verify through official channels', 'Text it later', 'Post it in a ticket', 1, 'Legitimate IT staff will never ask for your password. Verify the request using official contact methods.'),
(5, 'Which is a red flag in a request for information?', 'Polite tone', 'Urgent threats and pressure to act now', 'Clear official contact info', 'Specific details you can verify', 1, 'Attackers often use urgency and fear to bypass your judgment.'),
(5, 'You receive a prize SMS with a link. What is safest?', 'Click it immediately', 'Forward it to friends', 'Delete it after verifying via the official site', 'Reply with personal details', 2, 'Verify the offer through official sources before taking any action.')
ON CONFLICT DO NOTHING;

-- Sample quiz questions for Level 6 (Secure Browsing & 2FA)
INSERT INTO quiz_questions (level_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(6, 'Which URL is safest to enter your bank password?', 'http://bank.example.com', 'https://bank.example.com', 'https://bank.example.com.verify-login.ru', 'http://secure-bank-login.com', 1, 'Use HTTPS and the correct official domain.'),
(6, 'What does the padlock icon in the browser mean?', 'The site is trustworthy', 'The connection is encrypted', 'The site is malware-free', 'The site cannot be hacked', 1, 'The padlock indicates encryption, not that the site is safe or legitimate.'),
(6, 'Which 2FA method is generally strongest?', 'SMS code', 'Authenticator app (TOTP)', 'Email link', 'Security questions', 1, 'Authenticator apps are more secure than SMS or email, which can be intercepted.'),
(6, 'Why is SMS-based 2FA weaker?', 'SMS is too fast', 'It can be intercepted or SIM-swapped', 'It uses too much battery', 'It does not require a phone', 1, 'Attackers can intercept SMS or perform SIM-swap attacks to steal codes.')
ON CONFLICT DO NOTHING;

-- User stats table for XP and ratings
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    perfect_scores INTEGER DEFAULT 0,
    levels_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT xp_positive CHECK (total_xp >= 0),
    CONSTRAINT streak_positive CHECK (current_streak >= 0),
    CONSTRAINT longest_streak_positive CHECK (longest_streak >= 0)
);

CREATE INDEX idx_user_stats_user ON user_stats(user_id);
CREATE INDEX idx_user_stats_xp ON user_stats(total_xp);

-- Achievements definition table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT 'trophy',
    xp_reward INTEGER DEFAULT 0,
    category VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT xp_reward_positive CHECK (xp_reward >= 0),
    CONSTRAINT requirement_value_positive CHECK (requirement_value > 0)
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_code ON achievements(code);

-- User achievements junction table
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);

-- XP transactions log
CREATE TABLE IF NOT EXISTS xp_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_source ON xp_transactions(source);
CREATE INDEX idx_xp_transactions_date ON xp_transactions(created_at);

-- Story progress tracking (for analytics, not gating)
CREATE TABLE IF NOT EXISTS story_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intro_seen BOOLEAN DEFAULT FALSE,
    level1_story_seen BOOLEAN DEFAULT FALSE,
    level2_story_seen BOOLEAN DEFAULT FALSE,
    level3_story_seen BOOLEAN DEFAULT FALSE,
    level4_story_seen BOOLEAN DEFAULT FALSE,
    level5_story_seen BOOLEAN DEFAULT FALSE,
    completion_seen BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_progress_user ON story_progress(user_id);

-- Insert achievement definitions
INSERT INTO achievements (code, name, description, icon, xp_reward, category, requirement_type, requirement_value) VALUES
-- Progress achievements
('first_login', 'Welcome Aboard', 'Log in to the game for the first time', 'door', 10, 'progress', 'login_count', 1),
('level_1_complete', 'Password Protector', 'Complete Level 1: Password Security', 'shield', 25, 'progress', 'level_complete', 1),
('level_2_complete', 'Phishing Fighter', 'Complete Level 2: Phishing Detection', 'mail', 25, 'progress', 'level_complete', 2),
('level_3_complete', 'Network Guardian', 'Complete Level 3: Network Security', 'wifi', 25, 'progress', 'level_complete', 3),
('level_4_complete', 'Encryption Enforcer', 'Complete Level 4: Data Encryption', 'lock', 25, 'progress', 'level_complete', 4),
('level_5_complete', 'Social Shield', 'Complete Level 5: Social Engineering', 'users', 25, 'progress', 'level_complete', 5),
('level_6_complete', 'Web Sentinel', 'Complete Level 6: Secure Browsing & 2FA', 'globe', 25, 'progress', 'level_complete', 6),
('all_levels_complete', 'Digital Defender', 'Complete all available levels', 'crown', 100, 'progress', 'all_levels', 6),

-- Performance achievements
('perfect_score', 'Perfectionist', 'Get a perfect score on any quiz', 'star', 50, 'performance', 'perfect_score', 1),
('triple_perfect', 'Flawless', 'Get perfect scores on 3 different quizzes', 'stars', 100, 'performance', 'perfect_score', 3),
('speed_demon', 'Speed Demon', 'Complete a quiz with 80%+ score in under 60 seconds', 'lightning', 50, 'performance', 'speed_completion', 1),
('first_try', 'Natural Talent', 'Pass a quiz on your first attempt', 'target', 15, 'performance', 'first_try_pass', 1),

-- Streak achievements
('streak_3', 'Consistent Learner', 'Maintain a 3-day login streak', 'fire', 25, 'streak', 'login_streak', 3),
('streak_7', 'Dedicated Student', 'Maintain a 7-day login streak', 'flame', 50, 'streak', 'login_streak', 7),
('streak_30', 'Security Expert', 'Maintain a 30-day login streak', 'calendar', 150, 'streak', 'login_streak', 30),

-- Special achievements
('never_give_up', 'Never Give Up', 'Pass a quiz after failing it at least once', 'refresh', 30, 'special', 'retry_success', 1),
('xp_500', 'Rising Star', 'Earn 500 total XP', 'medal', 25, 'special', 'total_xp', 500),
('xp_1000', 'Cyber Champion', 'Earn 1000 total XP', 'trophy', 50, 'special', 'total_xp', 1000),

-- Story achievements
('story_intro', 'The Journey Begins', 'Meet CIPHER and learn about the data breach', 'book', 10, 'story', 'story_progress', 1),
('story_chapter_2', 'Inbox Inspector', 'Complete the phishing awareness story chapter', 'mail', 10, 'story', 'story_progress', 2),
('story_chapter_3', 'Network Aware', 'Complete the network security story chapter', 'wifi', 10, 'story', 'story_progress', 3),
('story_chapter_4', 'Data Keeper', 'Complete the data encryption story chapter', 'lock', 10, 'story', 'story_progress', 4),
('story_chapter_5', 'Human Firewall', 'Complete the social engineering story chapter', 'users', 10, 'story', 'story_progress', 5),
('story_chapter_6', 'Safe Surfer', 'Complete the secure browsing story chapter', 'globe', 10, 'story', 'story_progress', 6),
('story_complete', 'Digital Guardian', 'Complete the entire CIPHER storyline', 'crown', 50, 'story', 'story_progress', 7)
ON CONFLICT (code) DO NOTHING;
