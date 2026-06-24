package com.ecoquest.action;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

interface OutboxRepository extends MongoRepository<OutboxMessage, String> {
    List<OutboxMessage> findTop50ByPublishedAtIsNullOrderByCreatedAtAsc();
}
