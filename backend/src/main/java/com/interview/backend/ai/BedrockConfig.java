package com.interview.backend.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;

// BedrockAiService에서만 쓰는 BedrockRuntimeClient 빈이라, Provider가 bedrock일 때만 만든다.
@Configuration
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "bedrock")
public class BedrockConfig {

    @Bean
    public BedrockRuntimeClient bedrockRuntimeClient(@Value("${app.aws.bedrock.region}") String region) {
        // AWS Access Key/Secret은 여기서도, 다른 어디서도 직접 넣지 않는다.
        // Default Credentials Provider Chain이 환경변수 -> ~/.aws/credentials ->
        // EC2 인스턴스 프로파일(SafeInstanceProfile-sgu-yaksok 등) 순으로 알아서 찾는다.
        return BedrockRuntimeClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}
