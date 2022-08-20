import { TestBed } from '@angular/core/testing';

import { TrackGeneratorService } from './track-generator.service';

describe('TrackGeneratorService', () => {
  let service: TrackGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrackGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
