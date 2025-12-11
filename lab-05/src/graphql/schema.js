import { buildSchema } from 'graphql';

const schema = buildSchema(`
  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  type Category {
    id: ID!
    name: String!
    created_at: String
    updated_at: String
  }

  type Todo {
    id: ID!
    title: String!
    completed: Boolean!
    category_id: Int
    user_id: Int!
    due_date: String
    created_at: String
    updated_at: String
    category: Category
    user: User
  }

  type PaginationMeta {
    total: Int!
    count: Int!
    limit: Int!
    pages: Int!
    currentPage: Int!
  }

  type TodosPage {
    data: [Todo!]!
    meta: PaginationMeta!
  }

  input TodoInput {
    title: String!
    category_id: Int
    due_date: String
  }

  input TodoUpdateInput {
    title: String
    completed: Boolean
    category_id: Int
    due_date: String
  }

  type Query {
    me: User!
    categories: [Category!]!
    todos(
      category: Int
      completed: Boolean
      search: String
      sort: String
      order: String
      page: Int
      limit: Int
    ): TodosPage!
    todo(id: ID!): Todo
  }

  type Mutation {
    addTodo(input: TodoInput!): Todo!
    updateTodo(id: ID!, input: TodoUpdateInput!): Todo!
    toggleTodo(id: ID!): Todo!
  }
`);

export default schema;

