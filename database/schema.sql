-- Пользователи
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL, -- хранится только хеш пароля
    bio             TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Посты
CREATE TABLE posts (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    title           VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    visibility      ENUM('public', 'private', 'on_request') NOT NULL DEFAULT 'public',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Подписки
CREATE TABLE subscriptions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_id     BIGINT NOT NULL,
    followee_id     BIGINT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_subscription (follower_id, followee_id), -- нельзя подписаться дважды
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> followee_id), -- нельзя на себя
    CONSTRAINT fk_sub_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_followee FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Запросы доступа к скрытым постам "только по запросу"
CREATE TABLE post_access_requests (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id         BIGINT NOT NULL,
    requester_id    BIGINT NOT NULL,
    status          ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_access_request (post_id, requester_id), -- один запрос на пост от пользователя
    CONSTRAINT fk_req_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_req_user FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Теги
CREATE TABLE tags (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    slug            VARCHAR(50) NOT NULL UNIQUE -- url-вариант имени, напр. "web-dev"
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cвязь многие ко многим между постами и тегами
CREATE TABLE post_tags (
    post_id         BIGINT NOT NULL,
    tag_id          BIGINT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_pt_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Комментарии с вложенностью
CREATE TABLE comments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id         BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    parent_id       BIGINT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post   FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
    CONSTRAINT fk_comment_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- На малом объёме данных не влияют на скорость, но в перспективе ускорят работу на боевом проекте
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created_at ON posts(created_at);