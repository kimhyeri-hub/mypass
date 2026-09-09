package com.interview.backend.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

// 로컬 개발 단계 전용 구현체. AWS로 넘어가면 S3FileStorageService로 교체하고
// 이 클래스는 지우거나 "local" 프로파일에서만 활성화되게 두면 된다.
@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path rootDir;

    public LocalFileStorageService(@Value("${app.storage.local-dir:./uploads}") String localDir) {
        this.rootDir = Paths.get(localDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootDir);
        } catch (IOException e) {
            throw new IllegalStateException("업로드 디렉토리를 생성할 수 없습니다: " + rootDir, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String ext = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
        String storageKey = UUID.randomUUID() + ext;

        try {
            Path target = rootDir.resolve(storageKey).normalize();
            Files.copy(file.getInputStream(), target);
            return storageKey;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장에 실패했습니다.", e);
        }
    }

    @Override
    public Resource load(String storageKey) {
        try {
            Path file = rootDir.resolve(storageKey).normalize();
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다: " + storageKey);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다: " + storageKey, e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(rootDir.resolve(storageKey).normalize());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 삭제에 실패했습니다.", e);
        }
    }
}
