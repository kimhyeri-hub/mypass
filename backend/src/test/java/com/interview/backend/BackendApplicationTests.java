package com.interview.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

// LLM_BASE_URL / LLM_API_KEY 환경변수 없이도 컨텍스트가 뜨도록 테스트에서만 더미 값을 넣는다.
@SpringBootTest
@TestPropertySource(properties = {
		"app.openai.base-url=http://localhost:0/v1",
		"app.openai.api-key=test-key"
})
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
