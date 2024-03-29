// Internal Module Imports - From files within the project.
const Book = require("./model"); // Import the Book model from the model.js file.
const Author = require("../authors/model"); // Import the Author model from the model.js file.
const Genre = require("../genres/model"); // Import the Genre model from the model.js file.

// Controller Functions - Define the route handlers.

const addBooks = async (req, res) => {
  try {
    const { title, genre, author } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (!genre) {
      return res.status(400).json({ success: false, message: "Genre is required" });
    }

    if (!author) {
      return res.status(400).json({ success: false, message: "Author is required" });
    }

    const genreExists = await Genre.findOne({ where: { genre: genre } });

    if (!genreExists) {
      return res
        .status(404)
        .json({ success: false, message: `Genre ${genre} not found. Genre needs to already exist` });
    }

    const authorExists = await Author.findOne({ where: { author: author } });

    if (!authorExists) {
      return await Author.create({ author: author });
    }

    const book = await Book.create({ title, GenreId: genreExists.id, AuthorId: authorExists.id });

    return res.status(201).json({
      success: true,
      message: `${book.title} was added`,
      data: { id: book.id, title: book.title, author: authorExists.author, genre: genreExists.genre },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding book", error: error.errors });
  }
};

const getAllOrQueryBooks = async (req, res) => {
  try {
    const { title, author, genre } = req.query;
    const query = {};

    if (title) query.title = title;

    const include = [
      {
        model: Author,
        as: "Author",
      },
      {
        model: Genre,
        as: "Genre",
      },
    ];

    if (author) {
      include[0].where = { author };
    }

    if (genre) {
      include[1].where = { genre };
    }

    const books = await Book.findAll({
      where: query,
      attributes: { exclude: ["GenreId", "AuthorId"] },
      include: include,
    });

    if (!books.length) {
      return res.status(404).json({
        success: false,
        message: "No books found",
      });
    }

    const formattedBooks = books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.Author.author,
      genre: book.Genre.genre,
    }));

    let message = "All books";
    if (Object.keys(req.query).length) {
      message = "Filtered books";
    }

    return res.status(200).json({
      success: true,
      message: message,
      query: req.query,
      data: {
        books: formattedBooks,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error getting books",
      error: error.errors,
    });
  }
};

const deleteAllBooks = async (req, res) => {
  try {
    const booksToDelete = await Book.findAll();

    if (booksToDelete.length === 0) {
      return res.status(204).json({
        success: false,
        message: "No books found to delete.",
      });
    }

    const result = await Book.destroy({ where: {} });
    return res.status(200).json({
      success: true,
      message: `${result} books deleted.`,
      query: req.query,
      data: { deletedCount: result, deletedBooks: booksToDelete },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting books",
      error: error.errors,
    });
  }
};

const getAllTitles = async (req, res) => {
  try {
    const books = await Book.findAll();

    const titles = books.map((book) => book.title);

    if (!titles.length) {
      return res.status(404).json({
        success: false,
        message: "No titles found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Titles fetched successfully",
      data: titles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching titles",
      error: error.errors,
    });
  }
};

const getBookByTitle = async (req, res) => {
  try {
    const { title } = req.params;

    const book = await Book.findOne({
      where: { title: title },
      attributes: { exclude: ["GenreId", "AuthorId"] },
      include: [
        {
          model: Author,
          as: "Author",
        },
        {
          model: Genre,
          as: "Genre",
        },
      ],
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const formattedBook = {
      id: book.id,
      title: book.title,
      author: book.Author.author,
      genre: book.Genre.genre,
    };

    return res.status(200).json({
      success: true,
      message: "Single book fetched successfully",
      data: formattedBook,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching book",
      error: error.errors,
    });
  }
};

const dynamicallyUpdateByTitle = async (req, res) => {
  try {
    const currentBook = await Book.findOne({
      where: { title: req.params.title },
      include: [
        {
          model: Author,
          as: "Author",
        },
        {
          model: Genre,
          as: "Genre",
        },
      ],
    });

    if (!currentBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const { title, genre, author } = req.body;

    let updatedGenreId = currentBook.GenreId;
    let updatedAuthorId = currentBook.AuthorId;

    // Check if the new genre exists in the Genre table
    const existingGenre = await Genre.findOne({ where: { genre } });
    if (!existingGenre) {
      return res.status(400).json({
        success: false,
        message: "Invalid genre",
      });
    }
    updatedGenreId = existingGenre.id;

    // Check if the new author exists in the Author table
    let existingAuthor = await Author.findOne({ where: { author } });
    if (!existingAuthor) {
      existingAuthor = await Author.create({ author });
    }
    updatedAuthorId = existingAuthor.id;

    await Book.update(
      {
        title,
        GenreId: updatedGenreId,
        AuthorId: updatedAuthorId,
      },
      {
        where: { title: req.params.title },
      }
    );

    const updatedBook = await Book.findOne({
      where: { title },
      include: [
        {
          model: Author,
          as: "Author",
        },
        {
          model: Genre,
          as: "Genre",
        },
      ],
    });

    const fieldsToCheck = ["title", "author", "genre"];
    if (fieldsToCheck.every((field) => currentBook[field] === updatedBook[field])) {
      return res.status(304).json({
        success: false,
        message: "No changes detected. Book not updated.",
        data: {
          beforeUpdate: currentBook,
          afterUpdate: updatedBook,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: {
        beforeUpdate: {
          id: currentBook.id,
          title: currentBook.title,
          author: currentBook.Author.author,
          genre: currentBook.Genre.genre,
        },
        afterUpdate: {
          id: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.Author.author,
          genre: updatedBook.Genre.genre,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error updating book",
      error: error.errors,
    });
  }
};

const deleteBookByTitle = async (req, res) => {
  try {
    const booksToDelete = await Book.findOne({
      where: { title: req.params.title },
      include: [
        {
          model: Author,
          as: "Author",
        },
        {
          model: Genre,
          as: "Genre",
        },
      ],
    });

    if (!booksToDelete) {
      res.status(404).json({ success: false, message: "Book not found" });
      return;
    }

    await Book.destroy({
      where: {
        title: req.params.title,
      },
    });

    const formattedBook = {
      id: booksToDelete.id,
      title: booksToDelete.title,
      author: booksToDelete.Author.author,
      genre: booksToDelete.Genre.genre,
    };

    return res.status(200).json({
      success: true,
      message: "Single book deleted successfully",
      data: formattedBook,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting book",
      error: error.errors,
    });
  }
};

module.exports = {
  addBooks,
  getAllOrQueryBooks,
  deleteAllBooks,
  getAllTitles,
  getBookByTitle,
  dynamicallyUpdateByTitle,
  deleteBookByTitle,
};
