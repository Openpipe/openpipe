# This file was auto-generated by Fern from our API Definition.

import typing

from .update_log_tags_request_filters_item_contains import UpdateLogTagsRequestFiltersItemContains
from .update_log_tags_request_filters_item_equals import UpdateLogTagsRequestFiltersItemEquals

UpdateLogTagsRequestFiltersItem = typing.Union[
    UpdateLogTagsRequestFiltersItemEquals, UpdateLogTagsRequestFiltersItemContains
]
