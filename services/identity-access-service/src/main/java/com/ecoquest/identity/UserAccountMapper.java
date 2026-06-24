package com.ecoquest.identity;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
interface UserAccountMapper {
    @Mapping(target = "role", expression = "java(user.role.name())")
    @Mapping(target = "status", expression = "java(user.status.name())")
    UserProfile toProfile(UserAccount user);
}
