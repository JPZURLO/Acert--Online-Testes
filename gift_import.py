import json
import re
import uuid

from question_import import (
    MAX_IMPORTED_QUESTIONS,
    MAX_IMPORT_FILE_BYTES,
    QuestionImportError,
    display_text,
)


FORMAT_MARKER = re.compile(r"^\[(?:html|moodle|plain|markdown)\]\s*", re.IGNORECASE)
TITLE_PATTERN = re.compile(r"^::(?:\\.|[^:])*::", re.DOTALL)
WEIGHT_PATTERN = re.compile(r"^%([+-]?\d+(?:[.,]\d+)?)%")


def gift_unescape(value):
    output = []
    escaped = False
    for character in str(value or ""):
        if escaped:
            output.append(character)
            escaped = False
        elif character == "\\":
            escaped = True
        else:
            output.append(character)
    if escaped:
        output.append("\\")
    return "".join(output).strip()


def unescaped_index(value, target, start=0):
    escaped = False
    for index in range(start, len(value)):
        character = value[index]
        if escaped:
            escaped = False
            continue
        if character == "\\":
            escaped = True
            continue
        if character == target:
            return index
    return -1


def answer_span(block):
    start = unescaped_index(block, "{")
    if start < 0:
        return None
    depth = 0
    escaped = False
    end = -1
    for index in range(start, len(block)):
        character = block[index]
        if escaped:
            escaped = False
            continue
        if character == "\\":
            escaped = True
            continue
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                end = index
                break
    if end < 0:
        raise ValueError("bloco de respostas sem fechamento '}'.")
    if unescaped_index(block, "{", end + 1) >= 0:
        raise ValueError("use apenas um bloco de respostas por questão.")
    return start, end


def gift_blocks(text):
    blocks = []
    current = []
    start_line = 1
    depth = 0
    escaped = False
    for line_number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if stripped.startswith("$CATEGORY:") and depth == 0:
            if current:
                blocks.append((start_line, "\n".join(current).strip()))
                current = []
            blocks.append((line_number, stripped))
            continue
        if not current and (not stripped or stripped.startswith("//")):
            continue
        if not current:
            start_line = line_number
        if stripped.startswith("//") and depth == 0:
            continue
        if not stripped and depth == 0:
            if current:
                blocks.append((start_line, "\n".join(current).strip()))
                current = []
            continue
        current.append(line)
        for character in line:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == "{":
                depth += 1
            elif character == "}" and depth:
                depth -= 1
        escaped = False
    if current:
        blocks.append((start_line, "\n".join(current).strip()))
    return blocks


def answer_tokens(content):
    tokens = []
    marker = None
    buffer = []
    escaped = False
    for character in content:
        if escaped:
            buffer.extend(("\\", character))
            escaped = False
            continue
        if character == "\\":
            escaped = True
            continue
        if character in {"=", "~"}:
            if marker is not None:
                tokens.append((marker, "".join(buffer).strip()))
            marker = character
            buffer = []
        else:
            buffer.append(character)
    if escaped:
        buffer.append("\\")
    if marker is not None:
        tokens.append((marker, "".join(buffer).strip()))
    return tokens


def answer_value(raw_value):
    feedback_index = unescaped_index(raw_value, "#")
    value = raw_value if feedback_index < 0 else raw_value[:feedback_index]
    weight = None
    weight_match = WEIGHT_PATTERN.match(value.strip())
    if weight_match:
        weight = float(weight_match.group(1).replace(",", "."))
        value = value.strip()[weight_match.end():]
    return gift_unescape(value), weight

def parse_gift_questions(stream, return_dict=False, strict_legacy=False):
    payload = stream.read(MAX_IMPORT_FILE_BYTES + 1)
    if len(payload) > MAX_IMPORT_FILE_BYTES:
        raise QuestionImportError("O arquivo deve ter no máximo 5 MB.")
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise QuestionImportError("O arquivo GIFT deve estar codificado em UTF-8.") from exc

    questions = []
    errors = []
    warnings = []
    current_category = "Geral"

    for line_number, raw_block in gift_blocks(text):
        if raw_block.startswith("$CATEGORY:"):
            current_category = raw_block.replace("$CATEGORY:", "").strip()
            continue

        if len(questions) >= MAX_IMPORTED_QUESTIONS:
            warnings.append(f"O arquivo ultrapassa o limite de {MAX_IMPORTED_QUESTIONS} questões.")
            break

        # Extrai título entre :: se existir
        title_match = TITLE_PATTERN.match(raw_block)
        question_title = ""
        if title_match:
            question_title = gift_unescape(title_match.group(0).strip(":")[0])
        
        block = TITLE_PATTERN.sub("", raw_block, count=1).strip()
        block = FORMAT_MARKER.sub("", block, count=1).strip()

        try:
            span = answer_span(block)
        except ValueError as exc:
            errors.append(f"Linha {line_number}: {exc}")
            continue

        if not span:
            errors.append(f"Linha {line_number}: a questão GIFT precisa de respostas entre chaves.")
            continue

        start, end = span
        before = block[:start].strip()
        after = block[end + 1:].strip()
        prompt = gift_unescape(f"{before} {'_____' if after else ''} {after}".strip())
        content = block[start + 1:end].strip()

        if not prompt:
            errors.append(f"Linha {line_number}: informe o enunciado da questão.")
            continue

        imported_type = "single_choice" if not strict_legacy else "multiple_choice"
        options = []
        correct_answer = ""
        correct_answers_list = []
        upper_content = content.upper()

        if not content:
            # Dissertativa: {}
            imported_type = "essay" if (strict_legacy or not return_dict) else "long_answer"

        elif upper_content in {"T", "TRUE", "F", "FALSE"} or upper_content.startswith(("T#", "TRUE#", "F#", "FALSE#")):
            imported_type = "true_false"
            options = ["Verdadeiro", "Falso"]
            correct_answer = "Verdadeiro" if upper_content.startswith("T") else "Falso"
            correct_answers_list = [correct_answer]

        elif content.startswith("#"):
            if strict_legacy or (not return_dict and not strict_legacy):
                errors.append(f"Linha {line_number}: questões numéricas do GIFT ainda não são compatíveis.")
                continue
            imported_type = "numeric_answer"
            num_val = content[1:].strip()
            correct_answer = num_val
            correct_answers_list = [num_val]

        elif "->" in content:
            if strict_legacy or (not return_dict and not strict_legacy):
                errors.append(f"Linha {line_number}: questões de associação do GIFT ainda não são compatíveis.")
                continue
            imported_type = "matching"
            pairs = []
            for line in content.splitlines():
                if "->" in line:
                    parts = line.lstrip("=").split("->")
                    if len(parts) == 2:
                        pairs.append({"left": gift_unescape(parts[0]), "right": gift_unescape(parts[1])})
            correct_answer = json.dumps(pairs, ensure_ascii=False) if pairs else ""

        else:
            parsed_tokens = []
            for marker, raw_value in answer_tokens(content):
                answer, weight = answer_value(raw_value)
                if answer:
                    parsed_tokens.append((marker, answer, weight))

            if not parsed_tokens:
                imported_type = "essay" if (strict_legacy or not return_dict) else "short_answer"
                correct_answer = gift_unescape(content.lstrip("="))
                correct_answers_list = [correct_answer]
            else:
                has_wrong = any(marker == "~" for marker, _, _ in parsed_tokens)
                pos_weights = [ans for m, ans, w in parsed_tokens if m == "=" or (w is not None and w > 0)]

                if not return_dict or strict_legacy:
                    if has_wrong:
                        imported_type = "multiple_choice"
                        options = [ans for _, ans, _ in parsed_tokens]
                        correct_answers_list = pos_weights
                        correct_answer = pos_weights[0] if pos_weights else ""
                    else:
                        imported_type = "essay"
                        options = []
                        correct_answers_list = pos_weights
                        correct_answer = pos_weights[0] if pos_weights else ""
                else:
                    has_weights = any(w is not None for _, _, w in parsed_tokens)
                    if len(pos_weights) > 1 or (has_weights and len(pos_weights) >= 1):
                        imported_type = "multiple_choice"
                        options = [ans for _, ans, _ in parsed_tokens]
                        correct_answers_list = pos_weights
                        correct_answer = json.dumps(pos_weights, ensure_ascii=False)
                    else:
                        imported_type = "single_choice"
                        options = [ans for _, ans, _ in parsed_tokens]
                        correct_answer = pos_weights[0] if pos_weights else (options[0] if options else "")
                        correct_answers_list = [correct_answer] if correct_answer else []

        questions.append(
            {
                "id": f"gift-{uuid.uuid4().hex[:8]}",
                "type": imported_type,
                "title": question_title,
                "category": current_category,
                "prompt": display_text(prompt),
                "points": 10,
                "required": True,
                "options": options,
                "correctAnswer": display_text(correct_answer, 500),
                "correctAnswers": correct_answers_list,
                "lineNumber": line_number,
            }
        )

    if not questions and not errors:
        raise QuestionImportError("Nenhuma questão foi encontrada no arquivo GIFT.")

    if not return_dict:
        if errors:
            raise QuestionImportError("Corrija os itens indicados no GIFT e tente novamente.", errors[:25])
        return questions

    return {
        "questions": questions,
        "errors": errors,
        "warnings": warnings,
        "confidenceScore": round(max(0, 100 - (len(errors) * 15)), 2),
    }
