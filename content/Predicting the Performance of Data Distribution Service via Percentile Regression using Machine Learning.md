[[0_portfolio/Data Distribution Service (DDS)|Data Distribution Service (DDS)]] system designers do not know how their systems will perform unless they run performance experiments that capture the desired behaviour. These performance experiments can be quite costly in terms of money, time, and power consumption. If one desires good enough performance (let alone optimal) for a system that operates within the constrains of its environment, then one must carry out many performance experiments for different system configurations. The costs increase depending on the configuration because larger systems with more publishers/subscribers and larger data lengths will likely take longer to record performance metrics compared to smaller systems with less publishers/subscribers and smaller data lengths. The problem, clearly defined, is that it costs time, money, and power consumption to find the most ideal performing configuration for a [[0_portfolio/Data Distribution Service (DDS)|DDS]] system.

To the best of my knowledge, prior to my [[Machine Learning for Performance Prediction of Data Distribution Service (DDS) Paper|first publication]] on applying ML to [[0_portfolio/Data Distribution Service (DDS)|Data Distribution Service (DDS)]], no literature was shown to solve this problem using this solution. In fact, no literature existed that solved the problem for distribuetd systems, let alone publish-subscribe middleware in general.

- abstract
  - problem
    - people have to set up [[0_portfolio/Data Distribution Service (DDS)|DDS]] systems
    - their scenarios may contain parameter choices e.g. X scenario can only use 7 pubs and 3 subs and send 100B of data
      - what about other parameters values?
      - which values would lead to best performance?
      - can't know until you try
        - meaning you have to set up the system then run performance test
        - most of the time this is expensive, especially for bigger and more expensive configurations
  - others' solutions
    - no one has predicted DDS performance yet
  - my solution
    - gather data
    - transform data into 23 percentiles to recreate distribution
    - train model to predict 23 percentiles from the 6 input parameters for interpolation and extrapolation
    - interpolation/extrapolation based off input parameter values
    - ideally train on cheap configurations to predict for expensive configurations
    - how to simulate extrapolation?
      - split the data into "inside" and "outside" parameter values and treat outside as extrapolation
  - my results
    - random forest interpolation up to 0.99 R2
    - random forest extrapolation up to 0.94 R2
