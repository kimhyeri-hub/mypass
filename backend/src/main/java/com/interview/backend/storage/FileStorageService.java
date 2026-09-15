package com.interview.backend.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * 파일을 저장하고, 나중에 다시 꺼낼 때 쓸 key(로컬 경로 또는 S3 key 등)를 반환한다.
     */
    String store(MultipartFile file);

    Resource load(String storageKey);

    void delete(String storageKey);
}
