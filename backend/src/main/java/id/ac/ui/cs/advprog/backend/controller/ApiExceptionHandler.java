package id.ac.ui.cs.advprog.backend.controller;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatusException(ResponseStatusException exception) {
        HttpStatusCode statusCode = exception.getStatusCode();
        HttpStatus status = statusCode instanceof HttpStatus httpStatus
            ? httpStatus
            : HttpStatus.INTERNAL_SERVER_ERROR;
        String message = exception.getReason() == null || exception.getReason().isBlank()
            ? status.getReasonPhrase()
            : exception.getReason();
        return ResponseEntity.status(status)
            .body(new ApiErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException exception) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status)
            .body(new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                "Request body is invalid or malformed"
            ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException exception) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status)
            .body(new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                exception.getMessage()
            ));
    }

    public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message
    ) {
    }
}

