require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kreq4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("taskTracker").collection("users");
    const tasksCollection = client.db("taskTracker").collection("tasks");

    // !User related APIs--------------------------------------------

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return;
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // ! Task related APIs --------------------------------------------

    // POST: Add a new task
    app.post("/tasks", async (req, res) => {
      const task = req.body;
      try {
        const result = await tasksCollection.insertOne(task);
        console.log(result); // Log the result to debug
        res.send(result);
      } catch (error) {
        console.error("Error inserting task:", error);
        res.status(500).send({ error: "Failed to add task" });
      }
    });

    // GET: Retrieve all tasks
    app.get("/tasks", async (req, res) => {
      const result = await tasksCollection.find().toArray();
      res.send(result);
    });

    // GET: Retrieve task by ID
    app.get("/tasks/:id", async (req, res) => {
      const taskId = req.params.id;
      const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
      res.send(task);
    });

    // delete taskjs
    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tasksCollection.deleteOne(query);
      res.send(result);
    });

    app.put('/tasks/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: false };  // Don't create a new task if it doesn't exist
      const updatedTask = req.body;
  
      const task = {
          $set: {
              title: updatedTask.title,
              description: updatedTask.description,
              // Add other fields you want to update here
          },
      };
  
  
          const result = await tasksCollection.updateOne(filter, task, options);
  
         res.send(result)
  });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("task-tracker server is running");
}); // Add this closing bracket
app.listen(port, () => {
  console.log(`task-tracker server is running on port ${port}`);
});
