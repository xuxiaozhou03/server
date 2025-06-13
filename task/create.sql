-- 创建用户信息表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('parent', 'student', 'tutor') NOT NULL,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建家教老师信息表
CREATE TABLE tutors (
    id INT PRIMARY KEY,
    subject VARCHAR(50) NOT NULL,
    experience TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    reviews_count INT DEFAULT 0,
    resume TEXT,
    availability TEXT,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建学生信息表
CREATE TABLE students (
    id INT PRIMARY KEY,
    parent_id INT NOT NULL,
    grade VARCHAR(20),
    learning_goals TEXT,
    subjects_needed TEXT,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建课程预约表
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    tutor_id INT NOT NULL,
    subject VARCHAR(50) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE
);

-- 创建课程评价表
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    student_id INT NOT NULL,
    tutor_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE
);

-- 创建消息通知表
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建教学资源表
CREATE TABLE teaching_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tutor_id INT NOT NULL,
    appointment_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- 创建作业表
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    tutor_id INT NOT NULL,
    appointment_id INT NOT NULL,
    file_path VARCHAR(255) DEFAULT NULL,
    feedback TEXT,
    grade INT CHECK (grade BETWEEN 0 AND 100),
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feedback_time TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- 创建课程录像表
CREATE TABLE course_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    video_path VARCHAR(255) NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);