// ----- Prefab Grammar -----
// https://peggyjs.org/online.html

prefab = head:lines_stmt tail:(lines_stmt)* {
    return [head].concat(tail);
  }

lines_stmt = eol* stmt:stmt eol* {return stmt; }

stmt = typed_comment / typed_assign / typed_value

typed_assign = assign:assign { return {type: 'assign', assign}; }

assign = ws* name:name ws* '=' value:value { return {name, value}; }

typed_comment = comment:comment { return {type: 'comment', comment}; }

comment = ws* '//' comment:unescaped* eol? { return comment.join(''); }

typed_value = value:value { return {type: 'value', value}; }

value = ws* value:nws_value ';' { return value; }

nws_value = string / object

string = double_quot_string

double_quot_string = '"' chars:unescaped* '"' { return chars.join(""); }

object = 'new' ws+ type:name '(' ws* name:name? ws* ')' ws* '{' eol* content:prefab? eol* ws* '}' { return {type, name, content}; }

ws "whitespace" = [ \t\n\r]

name = char:char+ { return char.join(''); }

char = [0-9a-zA-Z$_]

unescaped = [^\0-\x1F\x22\x5C]

eol = [\n\r\u2028\u2029]
