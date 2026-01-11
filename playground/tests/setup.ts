import { expect } from "@jest/globals";
import { vibeMatchers } from "vibe-match";
import { vibeConfig } from "../index";

expect.extend(vibeMatchers(vibeConfig));
