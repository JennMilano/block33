const pg = require("pg");
const express = require("express");
const morgan = require("morgan");

const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/block33"
);

const server = express();
server.use(express.json());
server.use(morgan('dev'));

// Department Routes
server.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM department';
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

server.get('/api/departments/:id', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM department WHERE id = $1';
    const response = await client.query(SQL, [req.params.id]);
    if (response.rows.length === 0) {
      res.status(404).send('Department not found');
    } else {
      res.send(response.rows[0]);
    }
  } catch (error) {
    next(error);
  }
});

// Employee Routes
server.get('/api/employees', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM employee';
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

server.post('/api/employees', async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `
      INSERT INTO employee(name, department_id)
      VALUES($1, $2)
      RETURNING *
    `;
    const response = await client.query(SQL, [name, department_id]);
    res.status(201).send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

server.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = 'DELETE FROM employee WHERE id = $1';
    await client.query(SQL, [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

server.put('/api/employees/:id', async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `
      UPDATE employee
      SET name = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const response = await client.query(SQL, [name, department_id, req.params.id]);
    if (response.rows.length === 0) {
      res.status(404).send({ error: 'Employee not found' });
    } else {
      res.send(response.rows[0]);
    }
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
server.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ error: err.message || 'Something went wrong!' });
});

const init = async () => {
  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log("Connected to database");
    
    let SQL = `
    DROP TABLE IF EXISTS employee;
    DROP TABLE IF EXISTS department;
    
    CREATE TABLE department(
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL
    );
    
    CREATE TABLE employee(
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      department_id INTEGER REFERENCES department(id) NOT NULL
    );
    `;
    console.log('Creating tables...');
    await client.query(SQL);
    console.log("Tables created");

    SQL = ` 
    INSERT INTO department(name) VALUES ('Sales');
    INSERT INTO department(name) VALUES ('Marketing');
    INSERT INTO department(name) VALUES ('Engineering');
    INSERT INTO department(name) VALUES ('Design');
    INSERT INTO department(name) VALUES ('Finance');

    INSERT INTO employee(name, department_id) VALUES ('Eric DeCosta', (SELECT id FROM department WHERE name = 'Sales'));
    INSERT INTO employee(name, department_id) VALUES ('John Harbaugh', (SELECT id FROM department WHERE name = 'Marketing'));
    INSERT INTO employee(name, department_id) VALUES ('Dennis Pitta', (SELECT id FROM department WHERE name = 'Engineering'));
    INSERT INTO employee(name, department_id) VALUES ('Ray Lewis', (SELECT id FROM department WHERE name = 'Design'));
    INSERT INTO employee(name, department_id) VALUES ('Ed Reed', (SELECT id FROM department WHERE name = 'Finance'));
    `;
    console.log('Seeding data...');
    await client.query(SQL);
    console.log("Data seeded");

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

init();