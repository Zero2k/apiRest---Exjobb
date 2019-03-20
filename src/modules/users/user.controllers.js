import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { omit } from 'lodash';
import { getConnection, MoreThan } from 'typeorm';
import jwt from 'jsonwebtoken';

import User from '../../models/User';
import emailIsValid from '../../utils/emailIsValid';
import mailer from '../../utils/mailer';

const UserContoller = {
  async signUp(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        throw new Error('Username, Email and Password is required.');
      } else if (!emailIsValid(email)) {
        throw new Error('Email is not valid.');
      }

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const userExists = await userRepository.findOne({
        where: { email },
        select: ['id'],
      });

      if (userExists) {
        throw new Error('User already exists.');
      }

      /* Hash password */
      const hashPassword = await bcrypt.hash(password, 10);

      const user = {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashPassword,
      };

      /* Save new user to database */
      const newUser = await userRepository.save(user);

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: `Your user with email ${email} has been created successfully.`,
        data: omit(newUser, 'password'),
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async signIn(req, res) {
    try {
      const { email, password } = req.body;

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error('No user exist with that email.');
      }

      /* Check if password is correct */
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error('Wrong password.');
      }

      const payload = {
        user: {
          id: user.id,
        },
      };

      const token = jwt.sign(payload, process.env.SECRET, {
        expiresIn: '1d',
      });

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Login was successful.',
        token,
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async recovery(req, res) {
    try {
      const { email } = req.body;
      const { host } = req.headers;

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error('No user exist with that email.');
      }

      /* Create reset token */
      const token = crypto.randomBytes(64).toString('hex');

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      /* Save token and date to database */
      await userRepository.save(user);

      const body = {
        to: email,
        from: 'passwordreset@demo.com',
        subject: 'Node.js Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://'}${host}/reset/${token}\n\n`,
      };

      /* Send email with token */
      await mailer(body);

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Check your email to reset password.',
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async reset(req, res) {
    try {
      const { token } = req.params;
      const { newPassword, confirmPassword } = req.body;

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const user = await userRepository.findOne({
        where: { resetPasswordToken: token, resetPasswordExpires: MoreThan(Date.now()) },
      });

      if (!user) {
        throw new Error('Password reset token is invalid or has expired.');
      }

      /* Change password if new password match confirm */
      if (newPassword !== confirmPassword) {
        throw new Error('Password did not match.');
      }

      const hashPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      await userRepository.save(user);

      const body = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Your password has been changed',
        text: `${'Hello,\n\n This is a confirmation that the password for your account '}${
          user.email
        } has just been changed.\n`,
      };

      /* Send email with token */
      mailer(body)
        .then(() => {
          console.log('Email has been sent');
        })
        .catch((error) => {
          console.log(`Failed to send the email. Error: ${error && error.message}`);
        });

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Success! Your password has been changed.',
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async profiles(req, res) {
    try {
      const { page = 0, limit = 10 } = req.query;

      const userRepository = await getConnection().getRepository(User);

      /* Find all users */
      const users = await userRepository.find({ skip: page, take: limit });

      if (!users) {
        throw new Error('No users exist.');
      }

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Profiles',
        data: users.map(user => omit(user, ['password', 'resetPasswordToken', 'resetPasswordExpires'])),
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async profile(req, res) {
    try {
      const { userId } = req.params;

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('No user exist with that id.');
      }

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Profile',
        data: omit(user, 'password', 'resetPasswordToken', 'resetPasswordExpires'),
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async update(req, res) {
    try {
      const { username, email, password } = req.body;
      const { id } = req.user;

      /* Check if email is provided and it's valid */
      if (email && !emailIsValid(email)) {
        throw new Error('Email is not valid.');
      }

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const user = await userRepository.findOne({
        where: { id },
      });

      if (!user) {
        throw new Error('No user exist with that id.');
      }

      user.username = !username ? user.username : username.toLowerCase();
      user.email = !email ? user.email : email.toLowerCase();
      user.password = !password ? user.password : await bcrypt.hash(password, 10);

      /* Save new user to database */
      const updatedUser = await userRepository.save(user);

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Updated Profile',
        data: omit(updatedUser, 'password', 'resetPasswordToken', 'resetPasswordExpires'),
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.user;

      const userRepository = await getConnection().getRepository(User);

      /* Check if user exists */
      const user = await userRepository.findOne({
        where: { id },
      });

      if (!user) {
        throw new Error('No user exist with that id.');
      }

      await userRepository.remove(user);

      return res.status(200).json({
        response: {
          status: res.statusCode,
        },
        message: 'Deleted Profile',
      });
    } catch (error) {
      return res.status(500).json({
        response: {
          status: res.statusCode,
        },
        message: 'Error.',
        errors: error.message,
      });
    }
  },
};

export default UserContoller;
