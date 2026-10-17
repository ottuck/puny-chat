package com.buddychat.common;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;

/**
 * An expected failure with a stable {@code code} the app maps to a message. UI copy lives in the
 * app, never in the server.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final @Nullable String detail;

    public ApiException(HttpStatus status, String code) {
        this(status, code, null);
    }

    /** {@code detail}: a value the app puts in its message (e.g. whose seat a code is for). */
    public ApiException(HttpStatus status, String code, @Nullable String detail) {
        super(code);
        this.status = status;
        this.code = code;
        this.detail = detail;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public @Nullable String detail() {
        return detail;
    }
}
