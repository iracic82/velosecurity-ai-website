---
title: "Analyzing Bandwidth Consumption Using Python Classes: A Deep Dive"
description: "A class-based Python solution for analyzing per-application bandwidth consumption across enterprise sites. Practical OO design applied to a real network operations problem."
date: "2023-08-08"
author: "Igor Racic"
tags: ["python", "networking", "bandwidth", "observability"]
---

> *Originally published on [highvelocitynetworking.com](https://www.blog.highvelocitynetworking.com/2023/08/analyzing-bandwidth-consumption-using.html) on 2023-08-08. Reproduced here as part of the VeloSecurity AI knowledge base.*

**Introduction**

In today's digitally-driven era, monitoring bandwidth consumption is vital for companies to optimize their network resources. For corporations with multiple sites, it's particularly essential to understand which applications are consuming the most bandwidth both at the site level and across the corporation.

**Task at Hand:**

We're presented with a dataset named **dataset_2_apps.csv**, which contains daily application bandwidth consumption across different sites of the ACME Corporation. The objective is twofold:

a. Determine the top 10 bandwidth-consuming applications across the ACME Corporation.

b. Display the top 5 most bandwidth-consuming applications for each site.

Now, let's look at a Python-based solution that not only addresses this task effectively but also encapsulates the logic within a class, showcasing the power and organization provided by Python's object-oriented paradigm.

**Understanding Python Classes: A Brief Primer**

At its core, a class in Python is a blueprint for creating objects. It allows for the encapsulation of data (attributes) and methods (functions) into a single unit, offering several benefits:

- **Modularity**: Classes segment code into manageable blocks, making it easier to debug and understand.
- **Reusability**: Once a class is defined, it can be instantiated multiple times, thus promoting code reuse.
- **Encapsulation**: Classes hide internal details and expose only what's necessary, ensuring a clean interface.

**A Class-Based Solution: BandwidthAnalyzer**

**Decoding the Solution**

- **Initialization**: The __init__ method initializes our class, setting up the CSV file's path and creating a nested dictionary to store bandwidth data. This nested structure facilitates efficient data storage by site and application name.
- **Bandwidth Calculation**: The calculate_total_bandwidth method reads the CSV file and aggregates bandwidth data for each application across sites. It captures both 'ingress' and 'egress' bytes, adding them together to get the total bandwidth consumption for each application at each site.
- **Displaying Results**: The display_top_ip_addresses method takes an optional parameter num_addresses, allowing flexibility in the number of top applications displayed. It showcases results in two segments:

- Top applications for each site.
- Top applications across the entire Viertel Corporation.

**Why This Class-Centric Approach Works?**

- **Separation of Logic**: By creating distinct methods for bandwidth calculation and results display, the code maintains a clear separation of logic, making it more readable.
- **Scalability**: If Viertel Corporation were to introduce more analysis metrics in the future, it would be a simple task to extend the BandwidthAnalyzer class with additional methods.
- **Reusability**: If there's a need to analyze a different CSV file, you only need to create a new instance of the BandwidthAnalyzer class with the new file path.

**Conclusion**

Our BandwidthAnalyzer class elegantly and effectively tackles the problem of analyzing bandwidth consumption. Through this exercise, we see the power of Python classes, making our code modular, extensible, and readable. For professionals working in data analysis, such an approach is invaluable, ensuring that code remains organized as datasets and requirements evolve.

CSV file format - [DataSet file](https://gist.githubusercontent.com/iracic82/8bbae9bce7204d06fa95ecfe08dd91ec/raw/a0695e97789854a4dccf2ebcb3e7787aa04ce98a/gistfile1.txt)
