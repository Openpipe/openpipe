# This file was auto-generated by Fern from our API Definition.

import datetime as dt
import typing

import typing_extensions

from ..core.datetime_utils import serialize_datetime
from .unstable_dataset_entry_create_request_entries_item_messages_item_assistant_tool_calls_item_function import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemAssistantToolCallsItemFunction,
)

try:
    import pydantic.v1 as pydantic  # type: ignore
except ImportError:
    import pydantic  # type: ignore


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItemAssistantToolCallsItem(pydantic.BaseModel):
    id: str
    function: UnstableDatasetEntryCreateRequestEntriesItemMessagesItemAssistantToolCallsItemFunction
    type: typing_extensions.Literal["function"]

    def json(self, **kwargs: typing.Any) -> str:
        kwargs_with_defaults: typing.Any = {"by_alias": True, "exclude_unset": True, **kwargs}
        return super().json(**kwargs_with_defaults)

    def dict(self, **kwargs: typing.Any) -> typing.Dict[str, typing.Any]:
        kwargs_with_defaults: typing.Any = {"by_alias": True, "exclude_unset": True, **kwargs}
        return super().dict(**kwargs_with_defaults)

    class Config:
        frozen = True
        smart_union = True
        json_encoders = {dt.datetime: serialize_datetime}
