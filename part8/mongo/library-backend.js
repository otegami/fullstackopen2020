require('dotenv').config();

const { ApolloServer, UserInputError, gql, AuthenticationError } = require('apollo-server')
const { v1: uuid } = require('uuid')
const jwt = require('jsonwebtoken')

const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author');
const User = require('./models/user')

const MONGODB_URI = process.env.MONGODB_URI
const JWT_SECRET = process.env.JWT_SECRET

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB: ', error.message)
  })

const typeDefs = gql`
  type Author {
    name: String!
    id: String!
    born: Int
    bookCount: Int!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book!
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: (root, args) => {
      if (!args.author && !args.genre) {
        return Book.find({})
      }

      if (args.genre) {
        return Book.find({ genres: { $in: [ args.genre ] } })
      }
    },
    allAuthors: () => Author.find({}),
    me: (root, args, { currentUser }) => currentUser
  },
  Mutation: {
    addBook: (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError("note authenticated")
      }

      if(books.find(book => book.title === args.title)) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      const existedAuthor = authors.find(author => author.name === args.author)

      if (existedAuthor) {
        updatedAuthor = { ...existedAuthor, bookCount: existedAuthor.bookCount + 1 }
        authors = authors.map(author => author.name === args.name ? updatedAuthor : author)
      } else {
        authors = authors.concat({  id: uuid(), name: args.author, bookCount: 1 })
      }

      const addedBook = { ...args, id: uuid() }
      books = books.concat(addedBook)

      return addedBook
    },
    editAuthor: (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError("note authenticated")
      }

      const author = authors.find(author => author.name === args.name)

      if (!author) {
        return null
      }

      const updatedAuthor = { ...author, born: args.setBornTo }
      authors = authors.map(author => author.name === args.name ? updatedAuthor : author)

      return updatedAuthor
    },
    createUser: (root, args) => {
      const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })

      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if ( !user || args.password !== 'secret' ) {
        throw new UserInputError("wrong credentials")
      }

      const userForToken = {
        username: user.username,
        id: user._id
      }

      return { value: jwt.sign(userForToken, JWT_SECRET) }
    },
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )
      const currentUser = await User.findById(decodedToken.id).populate('friends')
      return { currentUser }
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
