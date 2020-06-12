import { parseModule, Token } from 'esprima'
// import escodegen from 'escodegen'
import {
  Expression,
  AssignmentExpression,
  MethodDefinition,
  Literal,
  Identifier,
  TaggedTemplateExpression,
  Comment,
  SimpleCallExpression,
  BinaryExpression,
  BinaryOperator,
  CallExpression,
  ClassDeclaration,
  Node,
  Declaration
} from 'estree'

type ParamTypes = 'string' | 'number' | 'bool' | 'json'

const lang = 'javascript'
const version = '1.0.0'

const isClassDecl = (stat: Declaration): stat is ClassDeclaration =>
  stat && stat.type === 'ClassDeclaration'

const isExport = (stat: Expression): stat is AssignmentExpression =>
  stat &&
  stat.type === 'AssignmentExpression' &&
  stat.left &&
  stat.left.type === 'MemberExpression' &&
  stat.left.object &&
  stat.left.object.type === 'Identifier' &&
  stat.left.object.name === 'module' &&
  stat.left.property &&
  stat.left.property.type === 'Identifier' &&
  stat.left.property.name === 'exports'

const getExportName = (stat: AssignmentExpression) => {
  // FIXME unnecessary check
  if (stat.right.type !== 'Identifier') {
    throw new Error('module.exports should be assigned to an identifier')
  }
  return stat.right.name
}

const isPublicMethod = (def: MethodDefinition): def is MethodDefinition =>
  def.key.type === 'Identifier' &&
  def.value.type === 'FunctionExpression' &&
  !def.key.name.startsWith('_')

const genAbi = (
  def: MethodDefinition,
  lastPos: number,
  comments: Comment[]
) => {
  for (const param of def.value.params) {
    if (param.type !== 'Identifier') {
      throw new Error(
        'invalid method parameter type. must be Identifier, got ' + param.type
      )
    }
  }

  const { name } = def.key as Identifier
  const abi: IOST.Response.Abi = {
    name,
    args: new Array(def.value.params.length).fill('string'),
    amount_limit: [],
    description: ''
  }
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]
    if (def.range == null) return

    if (
      comment.range &&
      comment.range[0] > lastPos &&
      comment.range[1] < def.range[0]
    ) {
      for (const i in def.value.params) {
        const params = def.value.params as Identifier[]
        const name = params[i].name
        const reg = new RegExp('@param\\s*{([a-zA-Z]+)}\\s*' + name)
        const reg1 = new RegExp('@param\\s*' + name + '\\s*{([a-zA-Z]+)}')
        let res = null
        if (((res = comment.value.match(reg)), res !== null)) {
          abi.args[i] = getValidType(res[1])
        } else if (((res = comment.value.match(reg1)), res !== null)) {
          abi.args[i] = getValidType(res[1])
        }
      }
      break
    }
  }
  return abi
}

const getValidType = (type: string): ParamTypes => {
  switch (type) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'bool':
    case 'boolean':
      return 'bool'
    case 'json':
      return 'json'
    default:
      throw new Error(
        "param type must be either 'string', 'number', 'bool/boolean' or 'json'"
      )
  }
}

const genAbiArr = (
  stat: Declaration,
  comments: Comment[]
): IOST.Response.Abi[] => {
  const abiArr = []
  if (!isClassDecl(stat) || stat.body.type !== 'ClassBody') {
    throw new Error(
      'invalid statement for generate abi. stat = ' + JSON.stringify(stat)
    )
  }

  if (stat.body.range == null) {
    return []
  }

  let initFound = false
  let lastPos = stat.body.range[0]
  for (const def of stat.body.body) {
    if (def.type === 'MethodDefinition' && isPublicMethod(def)) {
      const key = def.key as Identifier
      if (key.name === 'constructor') {
        throw new Error(
          "smart contract class shouldn't contain constructor method!"
        )
      } else if (key.name === 'init') {
        initFound = true
      } else {
        const abi = genAbi(def, lastPos, comments)

        if (abi) {
          abiArr.push(abi)
        }

        if (def.range) {
          lastPos = def.range[1]
        }
      }
    }
  }
  if (!initFound) {
    throw new Error('init not found!')
  }
  return abiArr
}

const checkInvalidKeyword = (tokens: Token[] | undefined) => {
  if (tokens == null) return
  for (let i = 0; i < tokens.length; i++) {
    if (
      (tokens[i].type === 'Identifier' || tokens[i].type === 'Literal') &&
      (tokens[i].value === '_IOSTInstruction_counter' ||
        tokens[i].value === '_IOSTBinaryOp' ||
        tokens[i].value === 'IOSTInstruction' ||
        tokens[i].value === '_IOSTTemplateTag' ||
        tokens[i].value === '_IOSTSpreadElement')
    ) {
      throw new Error(
        'use of _IOSTInstruction_counter or _IOSTBinaryOp keyword is not allowed'
      )
    }
    if (tokens[i].type === 'RegularExpression') {
      throw new Error(
        'use of RegularExpression is not allowed.' + tokens[i].value
      )
    }
    if (
      tokens[i].type === 'Keyword' &&
      (tokens[i].value === 'try' || tokens[i].value === 'catch')
    ) {
      throw new Error('use of try catch is not supported')
    }
  }
}

// const checkOperator = (tokens: Token[]) => {
//   for (let i = 0; i < tokens.length; i++) {
//     if (
//       tokens[i].type === 'Punctuator' &&
//       (tokens[i].value === '+' ||
//         tokens[i].value === '-' ||
//         tokens[i].value === '*' ||
//         tokens[i].value === '/' ||
//         tokens[i].value === '%' ||
//         tokens[i].value === '+=' ||
//         tokens[i].value === '-=' ||
//         tokens[i].value === '*=' ||
//         tokens[i].value === '/=' ||
//         tokens[i].value === '%=' ||
//         tokens[i].value === '++' ||
//         tokens[i].value === '--')
//     ) {
//       throw new Error('use of +-*/% operators is not allowed')
//     }
//   }
// }

const processOperator = (node: Expression | Node, pnode: Expression) => {
  if (node.type === 'ArrayPattern' || node.type === 'ObjectPattern') {
    throw new Error(
      'use of ArrayPattern or ObjectPattern is not allowed.' +
        JSON.stringify(node)
    )
  }
  const ops = [
    '+',
    '-',
    '*',
    '/',
    '%',
    '**',
    '|',
    '&',
    '^',
    '>>',
    '>>>',
    '<<',
    '==',
    '!=',
    '===',
    '!==',
    '>',
    '>=',
    '<',
    '<='
  ]

  if (node.type === 'AssignmentExpression' && node.operator !== '=') {
    const subnode = {} as BinaryExpression
    subnode.operator = node.operator.substr(
      0,
      node.operator.length - 1
    ) as BinaryOperator
    subnode.type = 'BinaryExpression'
    subnode.left = Object.assign({}, node.left) as Expression
    subnode.right = node.right
    node.operator = '='
    node.right = subnode
  } else if (node.type === 'BinaryExpression' && ops.includes(node.operator)) {
    const newnode = {} as SimpleCallExpression
    newnode.type = 'CallExpression'
    const calleeNode = {} as Identifier
    calleeNode.type = 'Identifier'
    calleeNode.name = '_IOSTBinaryOp'
    newnode.callee = calleeNode
    const opNode = {} as Literal
    opNode.type = 'Literal'
    opNode.value = node.operator
    opNode.raw = "'" + node.operator + "'"
    newnode.arguments = [node.left, node.right, opNode]
    node = newnode
  } else if (
    node.type === 'TemplateLiteral' &&
    (pnode === undefined || pnode.type !== 'TaggedTemplateExpression')
  ) {
    const newnode = {} as TaggedTemplateExpression
    newnode.type = 'TaggedTemplateExpression'
    const tagNode = {} as Identifier
    tagNode.type = 'Identifier'
    tagNode.name = '_IOSTTemplateTag'
    newnode.tag = tagNode
    newnode.quasi = node
    node = newnode
  } else if (node.type === 'SpreadElement') {
    const newnode = {} as CallExpression
    newnode.type = 'CallExpression'
    const calleeNode = {} as Identifier
    calleeNode.type = 'Identifier'
    calleeNode.name = '_IOSTSpreadElement'
    newnode.callee = calleeNode
    newnode.arguments = [node.argument]
    node.argument = newnode
  }
  return node
}

const traverseOperator = (node: any, pnode?: Expression) => {
  if (pnode) {
    node = processOperator(node, pnode)
    for (const key in node) {
      // eslint-disable-next-line no-prototype-builtins
      if (node.hasOwnProperty(key)) {
        const child = node[key]
        if (typeof child === 'object' && child !== null) {
          node[key] = traverseOperator(child, node)
        }
      }
    }
  }
  return node
}

// const handleOperator = (ast: Node) => {
//   ast = traverseOperator(ast)
//   // generate source from ast
//   return escodegen.generate(ast)
// }

const processContract = (source: string) => {
  if (source === undefined) {
    throw new Error('No code provided')
  }

  const ast = parseModule(source.toString(), {
    range: true,
    loc: false,
    comment: true,
    tokens: true
  })

  let abiArr: IOST.Response.Abi[] = []
  if (
    !ast ||
    ast === null ||
    !ast.body ||
    ast.body === null ||
    ast.body.length === 0
  ) {
    throw new Error('invalid source! ast = ' + ast)
  }

  checkInvalidKeyword(ast.tokens)
  // checkOperator(ast.tokens);
  // const newSource = "'use strict';\n" + handleOperator(ast)

  let className

  for (const stat of ast.body) {
    if (isClassDecl(stat as Declaration)) {
      //
    } else if (
      stat.type === 'ExpressionStatement' &&
      isExport(stat.expression)
    ) {
      className = getExportName(stat.expression as AssignmentExpression)
    }
  }

  if (className == null) {
    throw new Error('You have no exported class in the contract')
  }

  for (const stat of ast.body) {
    const statement = stat as Declaration
    if (isClassDecl(statement)) {
      if (
        statement.id &&
        statement.id.type === 'Identifier' &&
        statement.id.name === className
      ) {
        abiArr = genAbiArr(statement, ast.comments || [])
      }
    }
  }

  const abi = {} as IOST.Response.Contract
  abi['language'] = lang
  abi['version'] = version
  abi['abi' as 'abis'] = abiArr
  const abiStr = JSON.stringify(abi, null, 4)

  return abiStr
}

export default processContract
