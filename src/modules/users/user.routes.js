import { Router } from 'express';
import User from './user.controllers';
import requireJWT from '../../utils/jwt';

const routes = new Router();

routes.post('/signup', User.signUp);
routes.post('/login', User.signIn);
routes.post('/forgot', User.recovery);
routes.post('/reset/:token', User.reset);

routes.get('/', User.profiles);
routes.get('/:userId', requireJWT, User.profile);
routes.patch('/update', requireJWT, User.update);
routes.delete('/delete', requireJWT, User.delete);

export default routes;
