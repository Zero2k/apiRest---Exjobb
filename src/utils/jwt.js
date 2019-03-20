import jwt from 'jsonwebtoken';

const requireJWT = (req, res, next) => {
  const token = req.headers['x-access-token'];

  try {
    if (!token) {
      throw new Error('No token provided.');
    }

    const { user } = jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        throw new Error('Token has expired.');
      }
      return decoded;
    });

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      response: {
        status: res.statusCode,
      },
      message: 'Error.',
      error: error.message,
    });
  }
};

export default requireJWT;
