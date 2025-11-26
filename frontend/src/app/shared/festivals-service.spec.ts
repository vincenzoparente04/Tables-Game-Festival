import { TestBed } from '@angular/core/testing';

import { FestivalsService } from './festivals-service';

describe('FestivalsService', () => {
  let service: FestivalsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FestivalsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
