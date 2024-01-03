from typing import Any, Optional, cast
from openai.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionMessage,
    ChatCompletionMessageToolCall,
)
from openai.types.chat.chat_completion import Choice
from openai.types.chat.chat_completion_message import FunctionCall
from openai.types.chat.chat_completion_message_tool_call import Function
from openai.types.chat.chat_completion_chunk import ChoiceDeltaToolCall


def merge_openai_chunks(
    base: Optional[ChatCompletion], chunk: ChatCompletionChunk
) -> ChatCompletion:
    if base is None:
        return merge_openai_chunks(
            ChatCompletion(
                id=chunk.id,
                choices=[],
                created=chunk.created,
                model=chunk.model,
                object="chat.completion",
                system_fingerprint=chunk.system_fingerprint,
            ),
            chunk,
        )

    base_choices = base.choices.copy()
    for choice in chunk.choices:
        base_choice = next((c for c in base_choices if c.index == choice.index), None)

        if base_choice:
            base_choice.finish_reason = (
                choice.finish_reason or base_choice.finish_reason
            )

            if choice.delta and choice.delta.content:
                base_choice.message.content = (base_choice.message.content or "") + (
                    choice.delta.content or ""
                )
            if choice.delta and choice.delta.function_call:
                fn_call = base_choice.message.function_call or {}
                fn_call.name = (fn_call.name or "") + (
                    choice.delta.function_call.name or ""
                )
                fn_call.arguments = (fn_call.arguments or "") + (
                    choice.delta.function_call.arguments or ""
                )
            if choice.delta and choice.delta.tool_calls:
                tool_calls = base_choice.message.tool_calls or []
                tool_call_delta: ChoiceDeltaToolCall = choice.delta.tool_calls[0]
                if tool_call_delta.function.name:
                    tool_calls.append(
                        ChatCompletionMessageToolCall(
                            id=tool_call_delta.id,
                            type="function",
                            function=Function(
                                name=tool_call_delta.function.name,
                                arguments=tool_call_delta.function.arguments,
                            ),
                        )
                    )
                else:
                    tool_calls[
                        -1
                    ].function.arguments += tool_call_delta.function.arguments
                base_choice.message.tool_calls = tool_calls
        else:
            function_call = None
            if choice.delta.function_call:
                function_call = FunctionCall(
                    name=choice.delta.function_call.name,
                    arguments=choice.delta.function_call.arguments,
                )
            base_choices.append(
                Choice(
                    index=choice.index,
                    message=ChatCompletionMessage(
                        role="assistant",
                        content=choice.delta.content,
                        function_call=function_call,
                        tool_calls=choice.delta.tool_calls,
                    ),
                    # This is a hack to get around the fact that the Choice class requires a finish_reason.
                    # finish_reason will be overwritten when one is provided.
                    finish_reason="length",
                    logprobs=choice.logprobs,
                )
            )
    base.choices = base_choices
    return base
