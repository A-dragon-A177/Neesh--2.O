package com.neeshai.backend.util;

import java.util.List;

public record CursorResponse<T>(
    List<T> items,
    String nextCursor,
    boolean hasMore
) {}
