"""Async utility functions."""

import asyncio
from typing import Any, Callable, Coroutine, List, Optional, TypeVar
from functools import wraps

T = TypeVar("T")


async def gather_with_concurrency(
    n: int,
    *tasks: Coroutine,
    return_exceptions: bool = False,
) -> List[Any]:
    """
    Gather tasks with limited concurrency.

    Args:
        n: Maximum concurrent tasks
        *tasks: Coroutines to run
        return_exceptions: Whether to return exceptions
    Returns:
        List of results
    """
    semaphore = asyncio.Semaphore(n)

    async def sem_task(task):
        async with semaphore:
            return await task

    return await asyncio.gather(
        *(sem_task(task) for task in tasks),
        return_exceptions=return_exceptions,
    )


async def run_in_executor(
    func: Callable[..., T],
    *args,
    **kwargs,
) -> T:
    """
    Run a blocking function in an executor.

    Args:
        func: Function to run
        *args: Positional arguments
        **kwargs: Keyword arguments
    Returns:
        Function result
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
):
    """
    Decorator for retrying async functions.

    Args:
        max_attempts: Maximum retry attempts
        delay: Initial delay between retries
        backoff: Backoff multiplier for delay
        exceptions: Exceptions to catch
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_delay = delay
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff

            raise last_exception

        return wrapper
    return decorator


async def wait_for(
    coro: Coroutine,
    timeout: Optional[float] = None,
    default: Any = None,
) -> Any:
    """
    Wait for a coroutine with a timeout, returning default on timeout.

    Args:
        coro: Coroutine to wait for
        timeout: Timeout in seconds
        default: Default value on timeout
    Returns:
        Coroutine result or default
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return default


async def create_task_group(
    tasks: List[Coroutine],
    concurrency: Optional[int] = None,
) -> List[Any]:
    """
    Create a group of tasks with optional concurrency limit.

    Args:
        tasks: List of coroutines
        concurrency: Optional concurrency limit
    Returns:
        List of results
    """
    if concurrency:
        return await gather_with_concurrency(concurrency, *tasks)
    return await asyncio.gather(*tasks, return_exceptions=True)


class AsyncBatch:
    """
    Async batch processor for grouping operations.
    """

    def __init__(
        self,
        batch_size: int = 10,
        delay: float = 0.1,
    ):
        """
        Initialize the batch processor.

        Args:
            batch_size: Maximum batch size
            delay: Delay between batch processing
        """
        self._batch_size = batch_size
        self._delay = delay
        self._pending: List[Any] = []
        self._results: List[Any] = []
        self._lock = asyncio.Lock()

    async def add(self, item: Any) -> None:
        """
        Add an item to the batch.

        Args:
            item: Item to add
        """
        async with self._lock:
            self._pending.append(item)
            if len(self._pending) >= self._batch_size:
                await self._process_batch()

    async def flush(self) -> List[Any]:
        """
        Process any remaining items in the batch.

        Returns:
            List of results
        """
        async with self._lock:
            if self._pending:
                await self._process_batch()
            return self._results.copy()

    async def _process_batch(self) -> None:
        """Process the current batch."""
        if not self._pending:
            return

        batch = self._pending[:self._batch_size]
        self._pending = self._pending[self._batch_size:]

        results = await asyncio.gather(*batch, return_exceptions=True)
        self._results.extend(results)
