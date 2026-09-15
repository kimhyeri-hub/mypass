package com.interview.backend.project;

import org.springframework.core.io.Resource;

public record ProjectFileDownload(Resource resource, ProjectFile file) {}
