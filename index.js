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
    // await client.connect();

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
      try {
        const task = {
          ...req.body,
          order: 0,
          addedBy: req.body.addedBy,
          timestamp: new Date(),
        };

        if (!task.addedBy) {
          return res.status(400).send({ error: "User email is required" });
        }

        // console.log("Creating task:", task); 
        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).send({ error: "Failed to create task" });
      }
    });

    // GET: Retrieve tasks for 
    app.get("/tasks", async (req, res) => {
      try {
        const { addedBy } = req.query;
        // console.log("Request query:", req.query); 
        if (!addedBy) {
          // console.log("No addedBy provided"); 
          return res.status(400).send({ error: "User email is required" });
        }

        const query = { addedBy: addedBy };
        // console.log("MongoDB query:", query); 
        const tasks = await tasksCollection.find(query).toArray();
        // console.log("Found tasks:", tasks.length, "for user:", addedBy); 

        res.send(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send({ error: "Failed to fetch tasks" });
      }
    });

    // GET: Retrieve task by ID
    app.get("/tasks/:id", async (req, res) => {
      const taskId = req.params.id;
      const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
      res.send(task);
    });

    // delete taskjs
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { addedBy } = req.query;

        const query = {
          _id: new ObjectId(id),
          addedBy: addedBy, 
        };

        // console.log("Deleting task:", query); 

        const result = await tasksCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).send({ error: "Failed to delete task" });
      }
    });

    app.put("/tasks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { addedBy } = req.query; // Get user email from query

        const filter = {
          _id: new ObjectId(id),
          addedBy: addedBy, // Add user filter
        };

        const options = { upsert: false };
        const updatedTask = req.body;

        const updateDoc = {
          $set: {
            ...updatedTask,
            order: parseInt(updatedTask.order || 0),
            addedBy: addedBy, // Ensure addedBy is preserved
          },
        };

        // console.log("Updating task:", filter, updateDoc); // Debug log

        const result = await tasksCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).send({ error: "Failed to update task" });
      }
    });

    // Add this new endpoint for reordering tasks
    app.put("/tasks/reorder", async (req, res) => {
      try {
        const { tasks } = req.body;

        // Update each task's order
        const updatePromises = tasks.map((task) => {
          return tasksCollection.updateOne(
            { _id: new ObjectId(task.id) },
            { $set: { order: task.order } }
          );
        });

        await Promise.all(updatePromises);
        res.status(200).json({ message: "Tasks reordered successfully" });
      } catch (error) {
        console.error("Error reordering tasks:", error);
        res.status(500).json({ message: "Failed to reorder tasks" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
