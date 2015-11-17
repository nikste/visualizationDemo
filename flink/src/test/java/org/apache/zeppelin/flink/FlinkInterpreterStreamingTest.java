/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.zeppelin.flink;


import static org.junit.Assert.assertEquals;

import java.io.PrintStream;
import java.util.Properties;

import org.apache.zeppelin.interpreter.InterpreterContext;
import org.apache.zeppelin.interpreter.InterpreterResult;
import org.apache.zeppelin.interpreter.InterpreterResult.Code;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

public class FlinkInterpreterStreamingTest {

  private static FlinkInterpreterStreaming flink;
  private static InterpreterContext context;

  @BeforeClass
  public static void setUp() {
    Properties p = new Properties();
    flink = new FlinkInterpreterStreaming(p);
    flink.open();
    context = new InterpreterContext(null, null, null, null, null, null, null, null);
  }

  @AfterClass
  public static void tearDown() {
    flink.close();
    flink.destroy();
  }

  @Test
  public void testSimpleStatement() {
    InterpreterResult result = flink.interpret("val a=1", context);
    result = flink.interpret("print(a)", context);
    assertEquals("1", result.message());
  }


  @Test
  public void testWordCount() {
    /*
    val text = env.socketTextStream("localhost", 9999)

    val counts = text.flatMap { _.toLowerCase.split("\\W+") filter { _.nonEmpty } }
      .map { (_, 1) }
      .groupBy(0)
      .sum(1)

    counts.print

    env.execute("Scala Socket Stream WordCount")
     */
    //flink.interpret("val text = env.socketTextStream(\"localhost\", 9999)", context);
    flink.interpret("val text = env.fromElements(\"To be or not to be\")",context);
    flink.interpret("val counts = text.flatMap { _.toLowerCase.split(\"\\\\W+\") filter { _.nonEmpty } }.map { (_, 1) }.groupBy(0).sum(1)", context);
    flink.interpret("counts.print",context);
    InterpreterResult result = flink.interpret("env.execute(\"Scala Socket Stream WordCount\")", context);
    assertEquals(Code.SUCCESS, result.code());
  }

  @Test
  public void testWordCountCollect() {
    PrintStream outOld = System.out;
    String message = flink.interpret("val text = env.fromElements(\"To be or not to be\")", context).message();
    System.setOut(outOld);
    System.out.println(message);

    message = flink.interpret("val counts = text.flatMap { _.toLowerCase.split(\"\\\\W+\") filter { _.nonEmpty } }.map { (_, 1) }.keyBy(0).sum(1)", context).message();
    System.setOut(outOld);
    System.out.println(message);

    message = flink.interpret("counts.print", context).message();
    System.setOut(outOld);
    System.out.println(message);


    //message = flink.interpret("import org.apache.flink.contrib.streaming.DataStreamUtils._", context).message();
    message = flink.interpret("import org.apache.flink.contrib.streaming.scala.DataStreamUtils._", context).message();
    System.setOut(outOld);
    System.out.println(message);

    message = flink.interpret("var collected = collect[(String,Int)](counts)", context).message();
    System.setOut(outOld);
    System.out.println(message);

    InterpreterResult result = flink.interpret("while(collected.hasNext()){var el = collected.next();println(\"next element:\" + el) }",context);


    System.out.println("res:" + result.message());
    //InterpreterResult result = flink.interpret("env.execute(\"Scala Socket Stream WordCount\")", context);
    assertEquals(Code.SUCCESS, result.code());
  }
}
